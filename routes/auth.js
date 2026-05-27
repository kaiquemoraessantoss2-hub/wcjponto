const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
}

function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });
}

router.get('/setup-status', async (req, res) => {
  const { count } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
  res.json({ available: count === 0 });
});

router.post('/setup', async (req, res) => {
  const { count } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
  if (count > 0) return res.status(403).json({ error: 'Sistema já configurado. Use a tela de usuários para adicionar mais contas.' });

  const { nome, email, senha, papel = 'admin' } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  if (!['admin', 'encarregado'].includes(papel)) return res.status(400).json({ error: 'Papel inválido' });
  if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });

  const hash = bcrypt.hashSync(senha, 10);
  const { data, error } = await supabase.from('usuarios')
    .insert({ nome: nome.trim(), email: email.trim().toLowerCase(), senha_hash: hash, papel })
    .select().single();
  if (error) return res.status(500).json({ error: 'Erro ao criar usuário' });
  res.status(201).json({ id: data.id, nome: data.nome, email: data.email, papel: data.papel });
});

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  const emailNorm = email.trim().toLowerCase();

  const { data: user } = await supabase.from('usuarios').select('*').eq('email', emailNorm).single();
  console.log(`[LOGIN] email="${emailNorm}" | usuario_encontrado=${!!user} | senha_ok=${user ? bcrypt.compareSync(senha, user.senha_hash) : false}`);

  if (user && bcrypt.compareSync(senha, user.senha_hash)) {
    const token = signToken({ userId: user.id, userNome: user.nome, userEmail: user.email, papel: user.papel, tipo: 'usuario' });
    setTokenCookie(res, token);
    return res.json({ id: user.id, nome: user.nome, email: user.email, papel: user.papel, tipo: 'usuario' });
  }

  const { data: func } = await supabase.from('funcionarios').select('*').eq('email', emailNorm).eq('is_responsavel', 1).single();
  console.log(`[LOGIN] responsavel_encontrado=${!!func} | senha_ok=${func ? bcrypt.compareSync(senha, func.senha_hash) : false}`);

  if (func && bcrypt.compareSync(senha, func.senha_hash)) {
    const token = signToken({ userId: func.id, userNome: func.nome, userEmail: func.email, papel: 'responsavel', tipo: 'funcionario', equipeId: func.equipe_id });
    setTokenCookie(res, token);
    return res.json({ id: func.id, nome: func.nome, email: func.email, papel: 'responsavel', tipo: 'funcionario', equipe_id: func.equipe_id });
  }

  res.status(401).json({ error: 'Email ou senha inválidos' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout realizado' });
});

router.get('/me', isAuthenticated, async (req, res) => {
  if (req.session.tipo === 'funcionario') {
    const { data: func } = await supabase.from('funcionarios')
      .select('id, nome, email, cargo, equipe_id, is_responsavel')
      .eq('id', req.session.userId).single();
    if (!func) return res.status(404).json({ error: 'Não encontrado' });
    return res.json({ id: func.id, nome: func.nome, email: func.email, cargo: func.cargo, papel: 'responsavel', tipo: 'funcionario', equipe_id: func.equipe_id });
  }

  const { data: user } = await supabase.from('usuarios')
    .select('id, nome, email, papel, created_at')
    .eq('id', req.session.userId).single();
  if (!user) return res.status(404).json({ error: 'Não encontrado' });
  res.json({ ...user, tipo: 'usuario' });
});

router.get('/notifications', isAuthenticated, async (req, res) => {
  try {
    const { data } = await supabase
      .from('registros_ponto')
      .select('id, data, presente, updated_at, funcionarios!funcionario_id(nome), obras(nome)')
      .order('updated_at', { ascending: false })
      .limit(15);
    res.json(data || []);
  } catch {
    res.status(500).json({ error: 'Erro ao carregar notificações' });
  }
});

router.put('/profile', isAuthenticated, async (req, res) => {
  if (req.session.tipo !== 'usuario') {
    return res.status(403).json({ error: 'Apenas usuários do sistema podem alterar perfil' });
  }
  const { nome, senha_atual, nova_senha } = req.body;
  const updates = {};

  if (nome && nome.trim()) updates.nome = nome.trim();

  if (nova_senha) {
    if (!senha_atual) return res.status(400).json({ error: 'Senha atual é obrigatória' });
    if (nova_senha.length < 6) return res.status(400).json({ error: 'Nova senha deve ter ao menos 6 caracteres' });
    const { data: user } = await supabase.from('usuarios').select('senha_hash').eq('id', req.session.userId).single();
    if (!user || !bcrypt.compareSync(senha_atual, user.senha_hash)) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }
    updates.senha_hash = bcrypt.hashSync(nova_senha, 10);
  }

  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nenhuma alteração fornecida' });

  const { error } = await supabase.from('usuarios').update(updates).eq('id', req.session.userId);
  if (error) return res.status(500).json({ error: 'Erro ao atualizar perfil' });
  res.json({ message: 'Perfil atualizado com sucesso' });
});

router.get('/usuarios', isAuthenticated, async (req, res) => {
  if (req.session.papel !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  const { data } = await supabase.from('usuarios').select('id, nome, email, papel, created_at').order('nome');
  res.json(data || []);
});

router.post('/usuarios', isAuthenticated, async (req, res) => {
  if (req.session.papel !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  const { nome, email, senha, papel } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  if (!['admin', 'encarregado'].includes(papel)) return res.status(400).json({ error: 'Papel inválido' });
  if (senha.length < 4) return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' });

  const { data: existing } = await supabase.from('usuarios').select('id').eq('email', email.trim().toLowerCase()).single();
  if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

  const hash = bcrypt.hashSync(senha, 10);
  const { data, error } = await supabase.from('usuarios')
    .insert({ nome: nome.trim(), email: email.trim().toLowerCase(), senha_hash: hash, papel })
    .select().single();
  if (error) return res.status(500).json({ error: 'Erro ao criar usuário' });
  res.status(201).json({ id: data.id, nome: data.nome, email: data.email, papel: data.papel });
});

router.delete('/usuarios/:id', isAuthenticated, async (req, res) => {
  if (req.session.papel !== 'admin') return res.status(403).json({ error: 'Acesso restrito' });
  if (parseInt(req.params.id) === req.session.userId) return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });

  const { data: existing } = await supabase.from('usuarios').select('id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Usuário não encontrado' });

  await supabase.from('usuarios').delete().eq('id', req.params.id);
  res.json({ message: 'Usuário excluído' });
});

module.exports = router;
