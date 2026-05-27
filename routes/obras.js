const express = require('express');
const supabase = require('../lib/supabase');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', isAuthenticated, async (req, res) => {
  try {
    let query = supabase.from('obras').select(`
      *,
      obra_encarregados(usuario_id, usuarios(nome)),
      registros_ponto(funcionario_id)
    `).order('nome');

    if (req.session.papel !== 'admin') {
      const { data: oeRows } = await supabase.from('obra_encarregados')
        .select('obra_id').eq('usuario_id', req.session.userId);
      const obraIds = (oeRows || []).map(r => r.obra_id);
      if (obraIds.length === 0) return res.json([]);
      query = query.in('id', obraIds);
    }

    const { data: obras, error } = await query;
    if (error) return res.status(500).json({ error: 'Erro ao buscar obras' });

    const result = obras.map(o => ({
      id: o.id, nome: o.nome, local: o.local, descricao: o.descricao,
      data_inicio: o.data_inicio, data_termino: o.data_termino,
      empreiteira_id: o.empreiteira_id, created_at: o.created_at,
      encarregados_nomes: (o.obra_encarregados || []).map(oe => oe.usuarios?.nome).filter(Boolean).join(', '),
      total_funcionarios: new Set((o.registros_ponto || []).map(r => r.funcionario_id)).size
    }));

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', isAuthenticated, async (req, res) => {
  const { data: obra, error } = await supabase.from('obras').select('*').eq('id', req.params.id).single();
  if (error || !obra) return res.status(404).json({ error: 'Obra não encontrada' });

  if (req.session.papel === 'encarregado') {
    const { data: isResp } = await supabase.from('obra_encarregados')
      .select('id').eq('obra_id', req.params.id).eq('usuario_id', req.session.userId).single();
    if (!isResp) return res.status(403).json({ error: 'Você não é responsável por esta obra' });
  }

  const { data: oeRows } = await supabase.from('obra_encarregados')
    .select('usuarios(id, nome, email)').eq('obra_id', req.params.id);

  res.json({ ...obra, encarregados: (oeRows || []).map(r => r.usuarios).filter(Boolean) });
});

router.post('/', isAuthenticated, async (req, res) => {
  if (!['admin', 'encarregado'].includes(req.session.papel)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { nome, local, descricao, data_inicio, data_termino, encarregado_ids } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome da obra é obrigatório' });
  if (!data_inicio) return res.status(400).json({ error: 'Data de início é obrigatória' });

  const { data: obra, error } = await supabase.from('obras')
    .insert({ nome: nome.trim(), local: local || null, descricao: descricao || null, data_inicio, data_termino: data_termino || null })
    .select().single();
  if (error) return res.status(500).json({ error: 'Erro ao criar obra' });

  let ids = [];
  if (req.session.papel === 'admin' && Array.isArray(encarregado_ids)) {
    ids = encarregado_ids;
  } else if (req.session.papel === 'encarregado') {
    ids = [req.session.userId];
  }

  if (ids.length > 0) {
    await supabase.from('obra_encarregados').upsert(
      ids.map(uid => ({ obra_id: obra.id, usuario_id: uid })),
      { ignoreDuplicates: true }
    );
  }

  res.status(201).json({ id: obra.id, message: 'Obra criada com sucesso' });
});

router.put('/:id', isAuthenticated, async (req, res) => {
  if (!['admin', 'encarregado'].includes(req.session.papel)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { nome, local, descricao, data_inicio, data_termino, encarregado_ids } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome da obra é obrigatório' });

  const { data: existing } = await supabase.from('obras').select('id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Obra não encontrada' });

  if (req.session.papel === 'encarregado') {
    const { data: isResp } = await supabase.from('obra_encarregados')
      .select('id').eq('obra_id', req.params.id).eq('usuario_id', req.session.userId).single();
    if (!isResp) return res.status(403).json({ error: 'Sem permissão para editar esta obra' });
  }

  await supabase.from('obras')
    .update({ nome: nome.trim(), local: local || null, descricao: descricao || null, data_inicio, data_termino: data_termino || null })
    .eq('id', req.params.id);

  if (req.session.papel === 'admin' && Array.isArray(encarregado_ids)) {
    await supabase.from('obra_encarregados').delete().eq('obra_id', req.params.id);
    if (encarregado_ids.length > 0) {
      await supabase.from('obra_encarregados').upsert(
        encarregado_ids.map(uid => ({ obra_id: parseInt(req.params.id), usuario_id: uid })),
        { ignoreDuplicates: true }
      );
    }
  }

  res.json({ message: 'Obra atualizada com sucesso' });
});

router.delete('/:id', isAuthenticated, async (req, res) => {
  if (!['admin', 'encarregado'].includes(req.session.papel)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { data: existing } = await supabase.from('obras').select('id').eq('id', req.params.id).single();
  if (!existing) return res.status(404).json({ error: 'Obra não encontrada' });

  if (req.session.papel === 'encarregado') {
    const { data: isResp } = await supabase.from('obra_encarregados')
      .select('id').eq('obra_id', req.params.id).eq('usuario_id', req.session.userId).single();
    if (!isResp) return res.status(403).json({ error: 'Sem permissão para excluir esta obra' });
  }

  await supabase.from('obras').delete().eq('id', req.params.id);
  res.json({ message: 'Obra excluída com sucesso' });
});

router.get('/:id/encarregados', isAuthenticated, async (req, res) => {
  const { data } = await supabase.from('obra_encarregados')
    .select('usuarios(id, nome, email)').eq('obra_id', req.params.id);
  res.json((data || []).map(r => r.usuarios).filter(Boolean));
});

router.get('/:id/funcionarios', isAuthenticated, async (req, res) => {
  if (req.session.papel === 'encarregado') {
    const { data: isResp } = await supabase.from('obra_encarregados')
      .select('id').eq('obra_id', req.params.id).eq('usuario_id', req.session.userId).single();
    if (!isResp) return res.status(403).json({ error: 'Sem permissão' });
  }

  const { data } = await supabase.from('registros_ponto')
    .select('funcionario_id, funcionarios!funcionario_id(*)').eq('obra_id', req.params.id);

  const seenIds = new Set();
  const funcionarios = [];
  for (const r of (data || [])) {
    if (r.funcionarios && !seenIds.has(r.funcionario_id)) {
      seenIds.add(r.funcionario_id);
      funcionarios.push(r.funcionarios);
    }
  }
  funcionarios.sort((a, b) => a.nome.localeCompare(b.nome));
  res.json(funcionarios);
});

router.get('/:id/funcionarios-lista', isAuthenticated, async (req, res) => {
  try {
    const { data: all, error: errAll } = await supabase.from('funcionarios')
      .select('id, nome').neq('is_responsavel', 1).order('nome');
    if (errAll) return res.status(500).json({ error: 'Erro ao buscar funcionários: ' + errAll.message });

    let assignedSet = new Set();
    try {
      const { data: assigned } = await supabase.from('obra_funcionarios')
        .select('funcionario_id').eq('obra_id', req.params.id);
      assignedSet = new Set((assigned || []).map(r => r.funcionario_id));
    } catch (_) {}

    res.json((all || []).map(f => ({ ...f, atribuido: assignedSet.has(f.id) })));
  } catch (e) {
    res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
});

router.post('/:id/funcionarios-atribuir', isAuthenticated, async (req, res) => {
  if (!['admin', 'encarregado'].includes(req.session.papel)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { funcionario_ids } = req.body;

  await supabase.from('obra_funcionarios').delete().eq('obra_id', req.params.id);

  if (Array.isArray(funcionario_ids) && funcionario_ids.length > 0) {
    await supabase.from('obra_funcionarios').insert(
      funcionario_ids.map(fid => ({ obra_id: parseInt(req.params.id), funcionario_id: parseInt(fid) }))
    );
  }

  res.json({ message: 'Equipe da obra atualizada' });
});

module.exports = router;
