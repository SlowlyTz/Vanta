import session from 'express-session';
import initSqlJs from 'sql.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(dirname(dirname(dirname(__dirname))), 'db');
const DEFAULT_FILE = join(DB_DIR, 'sessions.db');

const PERSIST_DELAY_MS = 1000;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
// Sessions without a cookie maxAge (browser session cookies) still need to
// leave the store eventually; a day of inactivity is what Jellyfin allows too.
const SESSION_COOKIE_TTL_MS = 24 * 60 * 60 * 1000;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    expires INTEGER NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
`;

const expiresOf = (sess, now) => {
  const expires = sess?.cookie?.expires;
  if (expires) {
    const time = new Date(expires).getTime();
    if (Number.isFinite(time)) return time;
  }
  return now + SESSION_COOKIE_TTL_MS;
};

// express-session store on a sql.js database, written to disk a moment after
// each change so sessions survive restarts and deploys. `SQL` and `file` are
// injectable for tests; `file: null` keeps everything in memory.
export class SqliteSessionStore extends session.Store {
  constructor({ SQL, file = DEFAULT_FILE, now = () => Date.now() } = {}) {
    super();
    this.file = file;
    this.now = now;
    this.persistTimer = null;
    this.ready = (SQL ? Promise.resolve(SQL) : initSqlJs()).then(sql => {
      const existing = this.file && fs.existsSync(this.file) ? fs.readFileSync(this.file) : null;
      this.db = existing ? new sql.Database(existing) : new sql.Database();
      this.db.exec(SCHEMA);
      this.cleanup();
      return this;
    });
    this.cleanupTimer = setInterval(() => { this.cleanup(); this.persist(); }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref?.();
  }

  run(sql, params = []) {
    this.db.run(sql, params);
  }

  row(sql, params = []) {
    const statement = this.db.prepare(sql);
    try {
      statement.bind(params);
      return statement.step() ? statement.getAsObject() : null;
    } finally {
      statement.free();
    }
  }

  cleanup() {
    if (!this.db) return;
    this.run('DELETE FROM sessions WHERE expires <= ?', [this.now()]);
  }

  schedulePersist() {
    if (!this.file || this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persist();
    }, PERSIST_DELAY_MS);
    this.persistTimer.unref?.();
  }

  persist() {
    if (!this.file || !this.db) return;
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    fs.mkdirSync(dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, Buffer.from(this.db.export()));
  }

  get(sid, callback) {
    this.ready.then(() => {
      const row = this.row('SELECT data, expires FROM sessions WHERE sid = ?', [sid]);
      if (!row || row.expires <= this.now()) return callback(null, null);
      callback(null, JSON.parse(row.data));
    }).catch(callback);
  }

  set(sid, sess, callback) {
    this.ready.then(() => {
      this.run(
        'INSERT INTO sessions (sid, expires, data) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET expires = excluded.expires, data = excluded.data',
        [sid, expiresOf(sess, this.now()), JSON.stringify(sess)]
      );
      this.schedulePersist();
      callback?.(null);
    }).catch(error => callback?.(error));
  }

  touch(sid, sess, callback) {
    this.ready.then(() => {
      this.run('UPDATE sessions SET expires = ? WHERE sid = ?', [expiresOf(sess, this.now()), sid]);
      this.schedulePersist();
      callback?.(null);
    }).catch(error => callback?.(error));
  }

  destroy(sid, callback) {
    this.ready.then(() => {
      this.run('DELETE FROM sessions WHERE sid = ?', [sid]);
      this.schedulePersist();
      callback?.(null);
    }).catch(error => callback?.(error));
  }

  length(callback) {
    this.ready.then(() => {
      callback(null, this.row('SELECT COUNT(*) AS count FROM sessions')?.count ?? 0);
    }).catch(callback);
  }

  clear(callback) {
    this.ready.then(() => {
      this.run('DELETE FROM sessions');
      this.schedulePersist();
      callback?.(null);
    }).catch(error => callback?.(error));
  }

  close() {
    clearInterval(this.cleanupTimer);
    this.persist();
  }
}
