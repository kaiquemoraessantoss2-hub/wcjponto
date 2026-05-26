const express = require('express');
const supabase = require('../lib/supabase');
const { isAuthenticated, isAdmin, isEncarregadoOrAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', isAuthenticated, isEncarregadoOrAdmin, async (req, res) => {
  const { empreiteira_id } = req.query;

  let query = supabase.from('equipes').select(`
    *,
    empreiteiras(nome),
    funcionarios!equipes_responsavel_id_fkey(nome)
  `).order('nome');

  if (empreiteira_id) query = query.eq('empreiteira_id', empreiteira_id);

  const { data: equipes, error } = await query;
  if (error) return res.status(500).json({ error: 'Erro ao buscar equipes' });

  const equipeIds = (equipes || []).map(e => e.id);
  const { data: membros } = equipeIds.length > 0
    ? await supabase.from('funcionarios').select('equipe_id').in('equipe_id', equipeIds)
    : { data: [] };

  const membrosMap = {};
  for (const m of (membros || [])) {
    membrosMap[m.equipe_id] = (membrosMap[m.equipe_id] || 0) + 1;
  }

  res.json((equipes || []).map(e => ({
    id: e.id, nome: e.nome, empreiteira_id: e.empreiteira_id, responsavel_id: e.responsavel_id,
    created_at: e.created_at,
    empreiteira_nome: e.empreiteiras?.nome || null,
    responsavel_nome: e.funcionarios?.nome || null,
    total_membros: membrosMap[e.id] || 0
  })));
});

router.get('/:id', isAuthenticated, isEncarregadoOrAdmin, async (req, res) => {
  const { data: eq, error } = await supabase.from('equipes').select(`
    *,
    empreiteiras(nome),
    funcionarios!equipes_responsavel_id_fkey(nome)
  `).eq('id', req.params.id).single();
  if (error || !eq) return res.status(404).json({ error: 'Equipe não encontrada' });
  res.json({
    id: eq.id, nome: eq.nome, empreiteira_id: eq.empreiteira_id, responsavel_id: eq.responsavel_id,
    created_at: eq.created_at,
    empreiteira_nome: eq.empreiteiras?.nome || null,
    responsavel_nome: eq.funcionarios?.nome || null
  });
});

router.post('/', isAuthenticated, isEncarregadoOrAdmin, async (req, res) => {
  const { nome, empreiteira_id, responsavel_id } = req.body;
  if (!nome || !empreiteira_id) return res.status(400).json({ error: 'Nome e empreiteira são obrigatórios' });
  const { data, error } = await supabase.from('equipes')
    .insert({ nome: nome.trim(), empreiteira_id, responsavel_id: responsavel_id || null })
    .select().single();
  if (error) return res.status(500).json({ error: 'Erro ao criar equipe' });
  res.status(201).json({ id: data.id, message: 'Equipe criada' });
});

router.put('/:id', isAuthenticated, isEncarregadoOrAdmin, async (req, res) => {
  const { nome, empreiteira_id, responsavel_id } = req.body;
  await supabase.from('equipes')
    .update({ nome, empreiteira_id, responsavel_id: responsavel_id || null })
    .eq('id', req.params.id);
  res.json({ message: 'Equipe atualizada' });
});

router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  await supabase.from('equipes').delete().eq('id', req.params.id);
  res.json({ message: 'Equipe excluída' });
});

module.exports = router;
