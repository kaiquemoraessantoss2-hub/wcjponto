require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/obras', require('./routes/obras'));
app.use('/api/funcionarios', require('./routes/funcionarios'));
app.use('/api/empreiteiras', require('./routes/empreiteiras'));
app.use('/api/equipes', require('./routes/equipes'));
app.use('/api', require('./routes/registros'));

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.listen(PORT, () => {
  console.log('========================================');
  console.log('  PontoWCJ - Sistema de Ponto para Obras');
  console.log('  Servidor rodando em:');
  console.log(`  http://localhost:${PORT}`);
  console.log('========================================');
});
