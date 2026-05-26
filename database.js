const initSqlJs = require('sql.js');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const DB_DIR = path.join(__dirname, 'db');
const DB_PATH = path.join(DB_DIR, 'pontowcj.db');
let SQL = null;

class DatabaseWrapper {
  constructor(sqlDb) { this._db = sqlDb; }

  prepare(sql) {
    const self = this;
    return {
      get(...p) {
        const s = self._db.prepare(sql);
        const flat = p.flat();
        if (flat.length) s.bind(flat);
        const r = s.step() ? s.getAsObject() : undefined;
        s.free();
        return r;
      },
      all(...p) {
        const s = self._db.prepare(sql);
        const flat = p.flat();
        if (flat.length) s.bind(flat);
        const r = [];
        while (s.step()) r.push(s.getAsObject());
        s.free();
        return r;
      },
      run(...p) {
        const flat = p.flat();
        self._db.run(sql, flat.length ? flat : []);
        const r = self._db.exec("SELECT last_insert_rowid() as id, changes() as ch");
        const row = r?.[0];
        if (row) {
          const idi = row.columns.indexOf('id');
          const chi = row.columns.indexOf('ch');
          return { lastInsertRowid: row.values[0]?.[idi] || 0, changes: row.values[0]?.[chi] || 0 };
        }
        return { lastInsertRowid: 0, changes: 0 };
      }
    };
  }

  exec(sql) { return this._db.exec(sql); }

  close() {
    if (this._db) {
      try {
        const data = this._db.export();
        if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
        fs.writeFileSync(DB_PATH, Buffer.from(data));
      } catch (e) { console.error('Erro ao salvar:', e.message); }
      this._db.close();
      this._db = null;
    }
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      try {
        self._db.run("BEGIN TRANSACTION");
        const r = fn.apply(self, args);
        self._db.run("COMMIT");
        return r;
      } catch (e) {
        self._db.run("ROLLBACK");
        throw e;
      }
    };
  }
}

async function initSqlModule() { if (!SQL) SQL = await initSqlJs(); }

function getDb() {
  if (!SQL) throw new Error('SQL module not initialized');
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  let sqlDb = fs.existsSync(DB_PATH)
    ? new SQL.Database(new Uint8Array(fs.readFileSync(DB_PATH)))
    : new SQL.Database();
  sqlDb.run("PRAGMA foreign_keys = ON");
  return new DatabaseWrapper(sqlDb);
}

async function initDatabase() {
  await initSqlModule();
  if (fs.existsSync(DB_PATH)) return;

  const db = getDb();

  db.exec(`
    CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      papel TEXT NOT NULL CHECK(papel IN ('admin','encarregado')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE empreiteiras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE equipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      empreiteira_id INTEGER NOT NULL REFERENCES empreiteiras(id) ON DELETE CASCADE,
      responsavel_id INTEGER REFERENCES funcionarios(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE obras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      local TEXT,
      descricao TEXT,
      data_inicio TEXT,
      data_termino TEXT,
      empreiteira_id INTEGER REFERENCES empreiteiras(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE obra_encarregados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      UNIQUE(obra_id, usuario_id)
    );

    CREATE TABLE funcionarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT UNIQUE,
      cargo TEXT,
      telefone TEXT,
      equipe_id INTEGER REFERENCES equipes(id) ON DELETE SET NULL,
      email TEXT UNIQUE,
      senha_hash TEXT,
      is_responsavel INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE registros_ponto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      obra_id INTEGER NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
      funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      presente INTEGER NOT NULL DEFAULT 1,
      observacao TEXT,
      registrado_por INTEGER REFERENCES usuarios(id),
      registrado_por_func INTEGER REFERENCES funcionarios(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(obra_id, funcionario_id, data)
    );
  `);

  db.close();
}

module.exports = { initDatabase, getDb };
