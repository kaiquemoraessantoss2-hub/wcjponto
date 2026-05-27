const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../lib/supabase');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', isAuthenticated, async (req, res) => {
  const { nome, obra_id } = req.query;

  let query = supabase.from('funcionarios').select('*').order('nome');

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
    .select('id, nome, cargo, email').eq('is_responsavel', 1).order('nome');

  if (!responsaveis || responsaveis.length === 0) return res.json([]);

  const funcIds = responsaveis.map(f => f.id);

  const { data: obraLinks } = await supabase.from('obra_responsaveis')
    .select('responsavel_id, obras(nome)')
    .in('responsavel_id', funcIds);

  const obrasPerFunc = {};
  for (const r of (obraLinks || [])) {
    if (!r.obras) continue;
    if (!obrasPerFunc[r.responsavel_id]) obrasPerFunc[r.responsavel_id] = new Set();
    obrasPerFunc[r.responsavel_id].add(r.obras.nome);
  }

  res.json(responsaveis.map(f => ({
    id: f.id, nome: f.nome, cargo: f.cargo, email: f.email,
    obras_nomes: obrasPerFunc[f.id] ? [...obrasPerFunc[f.id]].join('||') : null
  })));
});

router.post('/responsaveis', isAuthenticated, async (req, res) => {
  if (!['admin', 'encarregado'].includes(req.session.papel)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { nome, cargo, email, senha, obra_id } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  if (!email || !email.trim()) return res.status(400).json({ error: 'Email é obrigatório' });
  if (!senha || senha.length < 4) return res.status(400).json({ error: 'Senha deve ter ao menos 4 caracteres' });

  const { data: existing } = await supabase.from('funcionarios').select('id').eq('email', email.trim().toLowerCase()).single();
  if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

  const hash = bcrypt.hashSync(senha, 10);
  const { data, error } = await supabase.from('funcionarios')
    .insert({ nome: nome.trim(), cargo: cargo || null, email: email.trim().toLowerCase(), senha_hash: hash, is_responsavel: 1 })
    .select().single();
  if (error) {
    return res.status(500).json({ error: 'Erro ao cadastrar responsável' });
  }

  if (obra_id) {
    await supabase.from('obra_responsaveis').insert({ obra_id: parseInt(obra_id), responsavel_id: data.id });
  }

  res.status(201).json({ id: data.id, message: 'Responsável cadastrado com sucesso' });
});

router.put('/responsaveis/:id', isAuthenticated, async (req, res) => {
  if (!['admin', 'encarregado'].includes(req.session.papel)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { nome, cargo, obra_ids } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

  const { error } = await supabase.from('funcionarios')
    .update({ nome: nome.trim(), cargo: cargo || null }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'Erro ao atualizar responsável' });

  if (Array.isArray(obra_ids)) {
    await supabase.from('obra_responsaveis').delete().eq('responsavel_id', req.params.id);
    if (obra_ids.length > 0) {
      await supabase.from('obra_responsaveis').insert(
        obra_ids.map(oid => ({ obra_id: parseInt(oid), responsavel_id: parseInt(req.params.id) }))
      );
    }
  }

  res.json({ message: 'Responsável atualizado com sucesso' });
});

router.get('/responsaveis/:id/obras', isAuthenticated, async (req, res) => {
  const { data } = await supabase.from('obra_responsaveis')
    .select('obra_id, obras(id, nome)').eq('responsavel_id', req.params.id);
  res.json((data || []).map(r => r.obras).filter(Boolean));
});

router.get('/:id', isAuthenticated, async (req, res) => {
  const { data: func, error } = await supabase.from('funcionarios').select('*').eq('id', req.params.id).single();
  if (error || !func) return res.status(404).json({ error: 'Funcionário não encontrado' });
  res.json(func);
});

router.post('/', isAuthenticated, async (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

  const { data, error } = await supabase.from('funcionarios')
    .insert({ nome: nome.trim() })
    .select().single();
  if (error) {
    return res.status(500).json({ error: 'Erro ao cadastrar funcionário' });
  }
  res.status(201).json({ id: data.id, message: 'Funcionário cadastrado com sucesso' });
});

router.put('/:id', isAuthenticated, async (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });

  const { data: existing } = await supabase.from('funcionarios').select('id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado' });

  const { error } = await supabase.from('funcionarios')
    .update({ nome: nome.trim() }).eq('id', req.params.id);
  if (error) {
    return res.status(500).json({ error: 'Erro ao atualizar funcionário' });
  }
  res.json({ message: 'Funcionário atualizado com sucesso' });
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  const { data: existing } = await supabase.from('funcionarios').select('id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Funcionário não encontrado' });

  await supabase.from('funcionarios').delete().eq('id', req.params.id);
  res.json({ message: 'Funcionário excluído com sucesso' });
});

module.exports = router;
