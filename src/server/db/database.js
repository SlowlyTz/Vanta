import initSqlJs from 'sql.js';
import { migratePushSubscriptionsTable, migrateRequestsTable, migrateTmdbMediaKey, requestsTable, tmdbMediaTable } from './migrations.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { writeFileAtomicSync } from '../utils/atomicWrite.js';

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

// sql.js keeps the database in memory; every write serialises all of it to
// disk. Writes are collected for a moment so a burst (a TMDB cache fill, a
// request with its media row) costs one export, and flush() writes at once
// for shutdown.
const PERSIST_DELAY_MS = 250;
let persistTimer = null;
let dirty = false;

const flush = () => {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (!dirty) return;
  dirty = false;
  writeFileAtomicSync(DB_FILE, Buffer.from(sqlite.export()));
};

const persist = () => {
  dirty = true;
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      flush();
    } catch (error) {
      dirty = true;
      console.error('[Database] could not write requests.db:', error.message);
    }
  }, PERSIST_DELAY_MS);
  persistTimer.unref?.();
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

  flush,

  close() {
    flush();
    sqlite.close();
  }
};

db.exec(`
  PRAGMA foreign_keys = ON;
`);

db.exec(`${tmdbMediaTable()}
${requestsTable()}`);

// Must run before any prepared statement is executed: db.prepare() is lazy, so a
// statement naming one of the new columns only fails once it is stepped.
const addedColumns = migrateRequestsTable(sqlite).length > 0;
const rekeyed = migrateTmdbMediaKey(sqlite);
if (addedColumns || rekeyed) persist();

// Problem reports about titles in the library (the Meldung page).
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK(item_type IN ('Movie', 'Series')),
    title TEXT NOT NULL,
    production_year INTEGER,
    report_scope TEXT NOT NULL DEFAULT 'all' CHECK(report_scope IN ('all', 'season', 'episode')),
    season_number INTEGER,
    episode_number INTEGER,
    episode_name TEXT,
    problem TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'resolved', 'dismissed')),
    user_id TEXT,
    username TEXT,
    handled_by TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
  CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);

  -- When a user last looked at their requests / reports: decisions after that
  -- light up the dot in the menu.
  CREATE TABLE IF NOT EXISTS notification_seen (
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    seen_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, kind)
  );
`);

// Per-user settings that follow the user to every device (see
// src/public/js/shared/preferences.js for the keys), as one JSON object.
db.exec(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

// "Meine Liste": movies and series a user wants to watch later, kept apart
// from the Jellyfin favourites.
db.exec(`
  CREATE TABLE IF NOT EXISTS watchlist (
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK(item_type IN ('Movie', 'Series')),
    added_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, item_id)
  );
  CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id, added_at);
`);

// Series a user took out of "Weiter schauen". Jellyfin has no switch for
// that; the series comes back once an episode is played after hidden_at.
db.exec(`
  CREATE TABLE IF NOT EXISTS resume_hidden (
    user_id TEXT NOT NULL,
    series_id TEXT NOT NULL,
    hidden_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, series_id)
  );
`);

// Notifications: the in-app list, what each user wants per kind (push and
// in-app; kind '*' is the push main switch) and the push subscriptions of
// their devices (Web Push, see push.service.js).
db.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at INTEGER NOT NULL,
    last_success_at INTEGER,
    failure_count INTEGER NOT NULL DEFAULT 0,
    session_id TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

  CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    push INTEGER NOT NULL DEFAULT 1,
    in_app INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, kind)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT,
    image_item_id TEXT,
    created_at INTEGER NOT NULL,
    read_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
`);

// A push_subscriptions table from before subscriptions were bound to sessions.
if (migratePushSubscriptionsTable(sqlite).length > 0) {
  persist();
}

db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

flush();

export const flushDatabase = flush;

export default db;
