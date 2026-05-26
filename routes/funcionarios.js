const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../lib/supabase');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', isAuthenticated, async (req, res) => {
  const { nome, obra_id } = req.query;

  let query = supabase.from('funcionarios').select('*').order('nome');

  if (req.session.papel === 'encarregado') {
    query = query.eq('encarregado_id', req.session.userId);
  }

  if (nome && nome.trim()) query = query.ilike('nome', `%${nome.trim()}%`);

  if (obra_id) {
    const { data: regRows } = await supabase.from('registros_ponto')
      .select('funcionario_id').eq('obra_id', obra_id);
    const ids = [...new Set((regRows || []).map(r => r.funcionario_id))];
    if (ids.length === 0) return res.json([]);
    query = query.in('id', ids);
  }

  const { data } = await query;
  res.json(data || []);
});

router.get('/responsaveis', isAuthenticated, async (req, res) => {
  if (!['admin', 'encarregado'].includes(req.session.papel)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { data: responsaveis } = await supabase.from('funcionarios')
    .select('id, nome, cargo, email, equipe_id').eq('is_responsavel', 1).order('nome');

  if (!responsaveis || responsaveis.length === 0) return res.json([]);

  const funcIds = responsaveis.map(f => f.id);

  const { data: equipes } = await supabase.from('equipes')
    .select('id, nome, empreiteira_id, responsavel_id, empreiteiras(nome)')
    .in('responsavel_id', funcIds);

  const equipeIds = (equipes || []).map(e => e.id);
  const { data: membros } = equipeIds.length > 0
    ? await supabase.from('funcionarios').select('equipe_id').in('equipe_id', equipeIds)
    : { data: [] };

  const membrosMap = {};
  for (const m of (membros || [])) {
    membrosMap[m.equipe_id] = (membrosMap[m.equipe_id] || 0) + 1;
  }

  const { data: regObras } = await supabase.from('registros_ponto')
    .select('funcionario_id, obras(nome)').in('funcionario_id', funcIds);

  const obrasPerFunc = {};
  for (const r of (regObras || [])) {
    if (!r.obras) continue;
    if (!obrasPerFunc[r.funcionario_id]) obrasPerFunc[r.funcionario_id] = new Set();
    obrasPerFunc[r.funcionario_id].add(r.obras.nome);
  }

  const equipeByResp = {};
  for (const e of (equipes || [])) equipeByResp[e.responsavel_id] = e;

  res.json(responsaveis.map(f => {
    const eq = equipeByResp[f.id];
    return {
      id: f.id, nome: f.nome, cargo: f.cargo, email: f.email, equipe_id: f.equipe_id,
      equipe_id_val: eq?.id || null,
      equipe_nome: eq?.nome || null,
      empreiteira_nome: eq?.empreiteiras?.nome || null,
      membros: eq ? (membrosMap[eq.id] || 0) : 0,
      obras_nomes: obrasPerFunc[f.id] ? [...obrasPerFunc[f.id]].join('||') : null
    };
  }));
});

router.post('/responsaveis', isAuthenticated, async (req, res) => {
  if (!['admin', 'encarregado'].includes(req.session.papel)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { nome, cargo, email, senha, cpf, telefone } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email é obrigatório' });
  if (!senha || senha.length < 4) return res.status(400).json({ error: 'Senha deve ter ao menos 4 caracteres' });

  const { data: existing } = await supabase.from('funcionarios').select('id').eq('email', email.trim().toLowerCase()).single();
  if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

  const hash = bcrypt.hashSync(senha, 10);
  const { data, error } = await supabase.from('funcionarios')
    .insert({ nome: nome.trim(), cpf: cpf || null, cargo: cargo || null, telefone: telefone || null, email: email.trim().toLowerCase(), senha_hash: hash, is_responsavel: 1 })
    .select().single();
  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'CPF ou email já cadastrado' });
    return res.status(500).json({ error: 'Erro ao cadastrar responsável' });
  }
  res.status(201).json({ id: data.id, message: 'Responsável cadastrado com sucesso' });
});

router.get('/:id', isAuthenticated, async (req, res) => {
  const { data: func, error } = await supabase.from('funcionarios').select('*').eq('id', req.params.id).single();
  if (error || !func) return res.status(404).json({ error: 'Funcionário não encontrado' });
  res.json(func);
});

router.post('/', isAuthenticated, async (req, res) => {
  const { nome, cpf, cargo, telefone } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

  const insertData = { nome: nome.trim(), cpf: cpf || null, cargo: cargo || null, telefone: telefone || null };
  if (req.session.papel === 'encarregado') {
    insertData.encarregado_id = req.session.userId;
  }

  const { data, error } = await supabase.from('funcionarios')
    .insert(insertData)
    .select().single();
  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'CPF já cadastrado no sistema' });
    return res.status(500).json({ error: 'Erro ao cadastrar funcionário' });
  }
  res.status(201).json({ id: data.id, message: 'Funcionário cadastrado com sucesso' });
});

router.put('/:id', isAuthenticated, async (req, res) => {
  const { nome, cpf, cargo, telefone } = req.body;

  const { data: existing } = await supabase.from('funcionarios').select('id, encarregado_id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado' });

  if (req.session.papel === 'encarregado' && existing.encarregado_id !== req.session.userId) {
    return res.status(403).json({ error: 'Sem permissão para editar este funcionário' });
  }

  const { error } = await supabase.from('funcionarios')
    .update({ nome, cpf, cargo, telefone }).eq('id', req.params.id);
  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'CPF já cadastrado' });
    return res.status(500).json({ error: 'Erro ao atualizar funcionário' });
  }
  res.json({ message: 'Funcionário atualizado com sucesso' });
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  const { data: existing } = await supabase.from('funcionarios').select('id, encarregado_id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado' });

  if (req.session.papel === 'encarregado' && existing.encarregado_id !== req.session.userId) {
    return res.status(403).json({ error: 'Sem permissão para excluir este funcionário' });
  }

  await supabase.from('funcionarios').delete().eq('id', req.params.id);
  res.json({ message: 'Funcionário excluído com sucesso' });
});

module.exports = router;
