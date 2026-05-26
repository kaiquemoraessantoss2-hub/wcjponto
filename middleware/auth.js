const jwt = require('jsonwebtoken');

function isAuthenticated(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Não autenticado. Faça login primeiro.' });
  try {
    req.session = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
  }
}

function isAdmin(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Não autenticado' });
  if (req.session.papel !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' });
  next();
}

function isEncarregadoOrAdmin(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Não autenticado' });
  if (req.session.papel === 'responsavel') return res.status(403).json({ error: 'Acesso restrito a encarregados' });
  next();
}

module.exports = { isAuthenticated, isAdmin, isEncarregadoOrAdmin };
