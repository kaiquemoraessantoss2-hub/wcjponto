const express = require('express');
const supabase = require('../lib/supabase');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

async function checkObraAccess(obraId, papel, userId) {
  if (papel === 'admin') return true;
  if (papel === 'responsavel') {
    const { data: link } = await supabase.from('obra_responsaveis')
      .select('id').eq('obra_id', obraId).eq('funcionario_id', userId).single();
    return !!link;
  }
  const { data } = await supabase.from('obra_encarregados')
    .select('id').eq('obra_id', obraId).eq('usuario_id', userId).single();
  return !!data;
}

router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const sixDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];

    const [
      { count: totalObras },
      { count: totalFunc },
      { data: presencaHojeData },
      { data: semanalRaw }
    ] = await Promise.all([
      supabase.from('obras').select('*', { count: 'exact', head: true }),
      supabase.from('funcionarios').select('*', { count: 'exact', head: true }),
      supabase.from('registros_ponto').select('presente').eq('data', hoje),
      supabase.from('registros_ponto').select('data, presente').gte('data', sixDaysAgo)
    ]);

    const presTotal = presencaHojeData?.length || 0;
    const presPresentes = (presencaHojeData || []).filter(r => r.presente).length;

    const semanalMap = {};
    for (const r of (semanalRaw || [])) {
      if (!semanalMap[r.data]) semanalMap[r.data] = { data: r.data, total: 0, presentes: 0 };
      semanalMap[r.data].total++;
      if (r.presente) semanalMap[r.data].presentes++;
    }
    const semanal = Object.values(semanalMap).sort((a, b) => a.data.localeCompare(b.data));

    res.json({
      total_obras: totalObras || 0,
      total_funcionarios: totalFunc || 0,
      presenca_hoje: presTotal > 0 ? Math.round((presPresentes / presTotal) * 100) : null,
      presenca_semanal: semanal
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

router.get('/obras/:obra_id/registros', isAuthenticated, async (req, res) => {
  if (!await checkObraAccess(req.params.obra_id, req.session.papel, req.session.userId)) {
    return res.status(403).json({ error: 'Sem permissão para esta obra' });
  }

  const { data: dataParam } = req.query;
  const data = req.query.data;
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data))
    return res.status(400).json({ error: 'Data inválida. Use YYYY-MM-DD' });

  let funcionarios = [];
  let ofIds = [];
  try {
    const { data: ofRows } = await supabase.from('obra_funcionarios')
      .select('funcionario_id').eq('obra_id', req.params.obra_id);
    ofIds = (ofRows || []).map(r => r.funcionario_id);
  } catch (_) {}

  if (ofIds.length > 0) {
    const { data: fList } = await supabase.from('funcionarios')
      .select('*').in('id', ofIds).order('nome');
    funcionarios = fList || [];
  } else {
    const { data: fList } = await supabase.from('funcionarios').select('*').order('nome');
    funcionarios = (fList || []).filter(f => f.is_responsavel !== 1);
  }

  const { data: registros } = await supabase.from('registros_ponto')
    .select('*').eq('obra_id', req.params.obra_id).eq('data', data);

  const regMap = {};
  for (const r of (registros || [])) regMap[r.funcionario_id] = r;

  const result = funcionarios.map(f => ({
    id: f.id, nome: f.nome, cpf: f.cpf, cargo: f.cargo,
    registro: regMap[f.id] ? { id: regMap[f.id].id, presente: !!regMap[f.id].presente, observacao: regMap[f.id].observacao } : null,
    presente: !!regMap[f.id]?.presente
  }));

  res.json({ data, obra: { id: parseInt(req.params.obra_id) }, registros: result });
});

router.post('/obras/:obra_id/registros', isAuthenticated, async (req, res) => {
  if (!await checkObraAccess(req.params.obra_id, req.session.papel, req.session.userId)) {
    return res.status(403).json({ error: 'Sem permissão para esta obra' });
  }

  const { data, presencas, remover } = req.body;
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data))
    return res.status(400).json({ error: 'Data inválida' });

  const hasPres = Array.isArray(presencas) && presencas.length > 0;
  const hasRem = Array.isArray(remover) && remover.length > 0;
  if (!hasPres && !hasRem)
    return res.status(400).json({ error: 'Nada para salvar' });

  if (req.session.papel === 'responsavel') {
    const { data: link } = await supabase.from('obra_responsaveis')
      .select('id').eq('obra_id', req.params.obra_id).eq('funcionario_id', req.session.userId).single();
    if (!link) {
      return res.status(403).json({ error: 'Você não tem permissão para registrar ponto nesta obra' });
    }
  }

  const obraId = parseInt(req.params.obra_id);

  if (hasPres) {
    const rows = presencas.map(p => ({
      obra_id: obraId,
      funcionario_id: p.funcionario_id,
      data,
      presente: p.presente ? 1 : 0,
      observacao: p.observacao || null,
      registrado_por: req.session.tipo === 'usuario' ? req.session.userId : null,
      registrado_por_func: req.session.tipo === 'funcionario' ? req.session.userId : null,
      updated_at: new Date().toISOString()
    }));
    const { error } = await supabase.from('registros_ponto').upsert(
      rows, { onConflict: 'obra_id,funcionario_id,data' }
    );
    if (error) return res.status(500).json({ error: 'Erro ao salvar: ' + error.message });
  }

  if (hasRem) {
    const { error: errDel } = await supabase.from('registros_ponto').delete()
      .eq('obra_id', obraId).eq('data', data)
      .in('funcionario_id', remover.map(Number));
    if (errDel) return res.status(500).json({ error: 'Erro ao remover: ' + errDel.message });
  }

  res.json({ message: 'Registros salvos' });
});

router.get('/obras/:obra_id/registros/mensal', isAuthenticated, async (req, res) => {
  if (!await checkObraAccess(req.params.obra_id, req.session.papel, req.session.userId)) {
    return res.status(403).json({ error: 'Sem permissão' });
  }

  const { mes } = req.query;
  if (!mes || !/^\d{4}-\d{2}$/.test(mes))
    return res.status(400).json({ error: 'Mês inválido. Use YYYY-MM' });

  const [year, month] = mes.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = `${mes}-01`;
  const lastDay = `${mes}-${String(daysInMonth).padStart(2, '0')}`;

  const { data: obra } = await supabase.from('obras').select('*').eq('id', req.params.obra_id).single();
  if (!obra) return res.status(404).json({ error: 'Obra não encontrada' });

  const { data: registros } = await supabase.from('registros_ponto')
    .select('*').eq('obra_id', req.params.obra_id)
    .gte('data', firstDay).lte('data', lastDay)
    .order('funcionario_id').order('data');

  const funcIdsInPeriod = [...new Set((registros || []).map(r => r.funcionario_id))];

  let funcionarios = [];
  if (funcIdsInPeriod.length > 0) {
    const { data: fList } = await supabase.from('funcionarios')
      .select('*').in('id', funcIdsInPeriod).order('nome');
    funcionarios = fList || [];
  }

  if (funcionarios.length === 0) {
    let ofIds = [];
    try {
      const { data: ofRows } = await supabase.from('obra_funcionarios')
        .select('funcionario_id').eq('obra_id', req.params.obra_id);
      ofIds = (ofRows || []).map(r => r.funcionario_id);
    } catch (_) {}

    if (ofIds.length > 0) {
      const { data: fList } = await supabase.from('funcionarios')
        .select('*').in('id', ofIds).order('nome');
      funcionarios = (fList || []).filter(f => f.is_responsavel !== 1);
    } else {
      const { data: fList } = await supabase.from('funcionarios').select('*').order('nome');
      funcionarios = (fList || []).filter(f => f.is_responsavel !== 1);
    }
  }

  let totalDiasUteis = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d);
    if (dt.getDay() !== 0) totalDiasUteis++;
  }

  const report = {
    obra: { id: obra.id, nome: obra.nome, local: obra.local },
    mes, diasNoMes: daysInMonth, totalDiasUteis,
    funcionarios: funcionarios.map(f => {
      const dias = {};
      let trab = 0, aus = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(year, month - 1, d);
        dias[d] = { presente: null, observacao: null, registro_id: null, isDiaUtil: dt.getDay() !== 0 };
      }
      for (const r of (registros || []).filter(r => Number(r.funcionario_id) === Number(f.id))) {
        const day = parseInt(r.data.split('-')[2]);
        dias[day] = { presente: !!r.presente, observacao: r.observacao, registro_id: r.id, isDiaUtil: true };
        if (r.presente) trab++; else aus++;
      }
      return { id: f.id, nome: f.nome, cargo: f.cargo, dias, diasTrabalhados: trab, diasAusente: aus };
    })
  };

  if (req.session.papel !== 'responsavel') {
    const { data: auditRaw } = await supabase.from('registros_ponto')
      .select('id, funcionario_id, data, presente, registrado_por, registrado_por_func')
      .eq('obra_id', req.params.obra_id).gte('data', firstDay).lte('data', lastDay)
      .order('data').order('funcionario_id');

    const userIds = [...new Set((auditRaw || []).filter(r => r.registrado_por).map(r => r.registrado_por))];
    const funcIds = [...new Set((auditRaw || []).filter(r => r.registrado_por_func).map(r => r.registrado_por_func))];

    const userMap = {};
    const funcMap = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase.from('usuarios').select('id, nome').in('id', userIds);
      for (const u of (users || [])) userMap[u.id] = u.nome;
    }
    if (funcIds.length > 0) {
      const { data: funcs } = await supabase.from('funcionarios').select('id, nome').in('id', funcIds);
      for (const f of (funcs || [])) funcMap[f.id] = f.nome;
    }

    report.audit = (auditRaw || []).map(r => ({
      id: r.id, funcionario_id: r.funcionario_id, data: r.data, presente: r.presente,
      registrado_por_nome: userMap[r.registrado_por] || funcMap[r.registrado_por_func] || null,
      tipo_registro: r.registrado_por_func != null ? 'responsavel' : 'encarregado'
    }));
  }

  res.json(report);
});

router.get('/obras/:obra_id/registros/mensal/:funcionario_id', isAuthenticated, async (req, res) => {
  if (!await checkObraAccess(req.params.obra_id, req.session.papel, req.session.userId)) {
    return res.status(403).json({ error: 'Sem permissão' });
  }
  const { mes } = req.query;
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ error: 'Mês inválido' });

  const [year, month] = mes.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = `${mes}-01`;
  const lastDay = `${mes}-${String(daysInMonth).padStart(2, '0')}`;

  const { data: func } = await supabase.from('funcionarios').select('*').eq('id', req.params.funcionario_id).single();
  if (!func) return res.status(404).json({ error: 'Funcionário não encontrado' });

  const { data: registros } = await supabase.from('registros_ponto')
    .select('*').eq('obra_id', req.params.obra_id).eq('funcionario_id', req.params.funcionario_id)
    .gte('data', firstDay).lte('data', lastDay).order('data');

  const dias = {};
  let trab = 0, aus = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d);
    dias[d] = { presente: null, observacao: null, registro_id: null, isDiaUtil: dt.getDay() !== 0 };
  }
  for (const r of (registros || [])) {
    const day = parseInt(r.data.split('-')[2]);
    dias[day] = { presente: !!r.presente, observacao: r.observacao, registro_id: r.id, isDiaUtil: true };
    if (r.presente) trab++; else aus++;
  }

  res.json({ funcionario: func, dias, diasTrabalhados: trab, diasAusente: aus, diasNoMes: daysInMonth });
});

function buildConsolidado(mes, registros) {
  const funcMap = {};
  for (const r of registros) {
    if (!funcMap[r.funcionario_id]) {
      funcMap[r.funcionario_id] = {
        id: r.funcionario_id,
        nome: r.funcionarios?.nome || '?',
        cargo: r.funcionarios?.cargo || null,
        total_dias_trabalhados: 0,
        total_dias_ausente: 0,
        obrasMap: {}
      };
    }
    const f = funcMap[r.funcionario_id];
    if (r.presente) f.total_dias_trabalhados++; else f.total_dias_ausente++;
    if (!f.obrasMap[r.obra_id]) {
      f.obrasMap[r.obra_id] = { obra_id: r.obra_id, obra_nome: r.obras?.nome || '?', dias_trabalhados: 0, dias_ausente: 0 };
    }
    if (r.presente) f.obrasMap[r.obra_id].dias_trabalhados++; else f.obrasMap[r.obra_id].dias_ausente++;
  }
  return {
    mes,
    funcionarios: Object.values(funcMap).map(f => ({
      id: f.id, nome: f.nome, cargo: f.cargo,
      total_dias_trabalhados: f.total_dias_trabalhados,
      total_dias_ausente: f.total_dias_ausente,
      obras: Object.values(f.obrasMap).sort((a, b) => a.obra_nome.localeCompare(b.obra_nome))
    })).sort((a, b) => a.nome.localeCompare(b.nome))
  };
}

router.get('/relatorio/consolidado', isAuthenticated, async (req, res) => {
  const { mes } = req.query;
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ error: 'Mês inválido. Use YYYY-MM' });

  const [year, month] = mes.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = `${mes}-01`;
  const lastDay = `${mes}-${String(daysInMonth).padStart(2, '0')}`;

  try {
    if (req.session.papel === 'responsavel') {
      const equipeId = req.session.equipeId;
      if (!equipeId) return res.json({ mes, funcionarios: [] });
      const { data: funcRows } = await supabase.from('funcionarios').select('id').eq('equipe_id', equipeId);
      const funcIds = (funcRows || []).map(f => f.id);
      if (funcIds.length === 0) return res.json({ mes, funcionarios: [] });
      const { data: registros } = await supabase.from('registros_ponto')
        .select('funcionario_id, obra_id, presente, obras(nome), funcionarios!funcionario_id(nome, cargo)')
        .gte('data', firstDay).lte('data', lastDay).in('funcionario_id', funcIds);
      return res.json(buildConsolidado(mes, registros || []));
    }

    let regQuery = supabase.from('registros_ponto')
      .select('funcionario_id, obra_id, presente, obras(nome), funcionarios!funcionario_id(nome, cargo)')
      .gte('data', firstDay).lte('data', lastDay);

    if (req.session.papel === 'encarregado') {
      const { data: oeRows } = await supabase.from('obra_encarregados')
        .select('obra_id').eq('usuario_id', req.session.userId);
      const obraIds = (oeRows || []).map(r => r.obra_id);
      if (obraIds.length === 0) return res.json({ mes, funcionarios: [] });
      regQuery = regQuery.in('obra_id', obraIds);
    }

    const { data: registros } = await regQuery;
    res.json(buildConsolidado(mes, registros || []));
  } catch (e) {
    res.status(500).json({ error: 'Erro ao gerar relatório consolidado' });
  }
});

router.delete('/registros/:id', isAuthenticated, async (req, res) => {
  const { data: reg } = await supabase.from('registros_ponto').select('*').eq('id', req.params.id).single();
  if (!reg) return res.status(404).json({ error: 'Registro não encontrado' });
  if (!await checkObraAccess(reg.obra_id, req.session.papel, req.session.userId)) {
    return res.status(403).json({ error: 'Sem permissão' });
  }
  await supabase.from('registros_ponto').delete().eq('id', req.params.id);
  res.json({ message: 'Registro excluído' });
});

module.exports = router;
