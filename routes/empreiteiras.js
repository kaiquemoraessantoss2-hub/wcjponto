const express = require('express');
const supabase = require('../lib/supabase');
const { isAuthenticated, isAdmin, isEncarregadoOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', isAuthenticated, isEncarregadoOrAdmin, async (req, res) => {
  const { data: emp } = await supabase.from('empreiteiras').select('*').order('nome');
  const { data: equipeCount } = await supabase.from('equipes').select('empreiteira_id');

  const countMap = {};
  for (const e of (equipeCount || [])) {
    countMap[e.empreiteira_id] = (countMap[e.empreiteira_id] || 0) + 1;
  }

  res.json((emp || []).map(e => ({ ...e, total_equipes: countMap[e.id] || 0 })));
});

router.get('/:id', isAuthenticated, isEncarregadoOrAdmin, async (req, res) => {
  const { data: emp, error } = await supabase.from('empreiteiras').select('*').eq('id', req.params.id).single();
  if (error || !emp) return res.status(404).json({ error: 'Empreiteira não encontrada' });
  res.json(emp);
});

router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  const { data, error } = await supabase.from('empreiteiras')
    .insert({ nome: nome.trim(), descricao: descricao || null })
    .select().single();
  if (error) return res.status(500).json({ error: 'Erro ao criar empreiteira' });
  res.status(201).json({ id: data.id, message: 'Empreiteira criada' });
});

router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  const { nome, descricao } = req.body;
  await supabase.from('empreiteiras').update({ nome, descricao }).eq('id', req.params.id);
  res.json({ message: 'Empreiteira atualizada' });
});

router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  await supabase.from('empreiteiras').delete().eq('id', req.params.id);
  res.json({ message: 'Empreiteira excluída' });
});

module.exports = router;
