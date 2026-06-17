import initSqlJs from 'sql.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(dirname(dirname(dirname(__dirname))), 'db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_FILE = join(DB_DIR, 'requests.db');
const SQL = await initSqlJs();
const sqlite = fs.existsSync(DB_FILE)
  ? new SQL.Database(fs.readFileSync(DB_FILE))
  : new SQL.Database();

const persist = () => {
  fs.writeFileSync(DB_FILE, Buffer.from(sqlite.export()));
};

const normalizeParams = (params) => {
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
};

const getLastInsertRowid = () => {
  const result = sqlite.exec('SELECT last_insert_rowid() AS id');
  return result[0]?.values?.[0]?.[0] || 0;
};

const createStatement = (sql) => ({
  run(...params) {
    sqlite.run(sql, normalizeParams(params));
    const result = {
      changes: sqlite.getRowsModified(),
      lastInsertRowid: getLastInsertRowid()
    };
    persist();
    return result;
  },

  get(...params) {
    const rows = this.all(...params);
    return rows[0];
  },

  all(...params) {
    const statement = sqlite.prepare(sql);
    const values = normalizeParams(params);

    try {
      if (values.length > 0) {
        statement.bind(values);
      }

      const rows = [];
      while (statement.step()) {
        rows.push(statement.getAsObject());
      }
      return rows;
    } finally {
      statement.free();
    }
  }
});

const db = {
  exec(sql) {
    sqlite.exec(sql);
    persist();
  },

  prepare(sql) {
    return createStatement(sql);
  },

  close() {
    persist();
    sqlite.close();
  }
};

db.exec(`
  PRAGMA foreign_keys = ON;
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tmdb_media (
    tmdb_id INTEGER PRIMARY KEY,
    tmdb_type TEXT NOT NULL CHECK(tmdb_type IN ('movie', 'tv')),
    title TEXT NOT NULL,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    release_date TEXT,
    first_air_date TEXT,
    media_type TEXT NOT NULL,
    score REAL DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    cached_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER NOT NULL,
    tmdb_type TEXT NOT NULL CHECK(tmdb_type IN ('movie', 'tv')),
    title TEXT NOT NULL,
    media_type TEXT NOT NULL,
    poster_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'imported', 'rejected')),
    seasons JSON,
    note TEXT DEFAULT '',
    user_id INTEGER,
    username TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tmdb_id) REFERENCES tmdb_media(tmdb_id)
  );
`);

export default db;
