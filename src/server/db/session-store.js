// express-session store on a sql.js database (db/sessions.db), written to disk a
// moment after each change so sessions survive restarts and deploys.
import session from 'express-session';
import initSqlJs from 'sql.js';
import { join } from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { writeFileAtomicSync } from '../utils/atomicWrite.js';
import { DB_DIR } from '../config/paths.js';

const DEFAULT_FILE = join(DB_DIR, 'sessions.db');

const PERSIST_DELAY_MS = 1000;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
// Sessions without a cookie maxAge (browser session cookies) still need to
// leave the store eventually; a day of inactivity is what Jellyfin allows too.
const SESSION_COOKIE_TTL_MS = 24 * 60 * 60 * 1000;
// A request that was still running when its session was ended must not save
// it back afterwards; ended ids are remembered this long.
const ENDED_MEMORY_MS = 60 * 60 * 1000;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    expires INTEGER NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
`;

// What a client may see of a session id: enough to tell sessions apart,
// useless to take one over.
export const publicSessionId = (sid) => crypto.createHash('sha256').update(String(sid)).digest('hex').slice(0, 16);

const expiresOf = (sess, now) => {
  const expires = sess?.cookie?.expires;
  if (expires) {
    const time = new Date(expires).getTime();
    if (Number.isFinite(time)) return time;
  }
  return now + SESSION_COOKIE_TTL_MS;
};

// `SQL` and `file` are injectable for tests; `file: null` keeps everything in memory.
export class SqliteSessionStore extends session.Store {
  constructor({ SQL, file = DEFAULT_FILE, now = () => Date.now() } = {}) {
    super();
    this.file = file;
    this.now = now;
    this.persistTimer = null;
    this.ended = new Map(); // sid -> when it was destroyed
    this.ready = (SQL ? Promise.resolve(SQL) : initSqlJs()).then(sql => {
      const existing = this.file && fs.existsSync(this.file) ? fs.readFileSync(this.file) : null;
      this.db = existing ? new sql.Database(existing) : new sql.Database();
      this.db.exec(SCHEMA);
      this.cleanup();
      return this;
    });
    // Expired sessions leave the store (and the file) every quarter hour.
    this.cleanupTimer = setInterval(() => { if (this.cleanup() > 0) this.persistSafely(); }, CLEANUP_INTERVAL_MS);
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

  // Answers how many expired sessions it removed.
  cleanup() {
    for (const [sid, at] of this.ended) if (this.now() - at >= ENDED_MEMORY_MS) this.ended.delete(sid);
    if (!this.db) return 0;
    this.run('DELETE FROM sessions WHERE expires <= ?', [this.now()]);
    return this.db.getRowsModified();
  }

  // Removes sessions for good: a late save of the same id is ignored.
  remove(sids) {
    for (const sid of sids) {
      this.run('DELETE FROM sessions WHERE sid = ?', [sid]);
      this.ended.set(sid, this.now());
    }
  }

  // Every stored session that has not expired, parsed.
  liveSessions() {
    const sessions = [];
    const statement = this.db.prepare('SELECT sid, data, expires FROM sessions WHERE expires > ?');
    try {
      statement.bind([this.now()]);
      while (statement.step()) {
        const { sid, data, expires } = statement.getAsObject();
        let sess = null;
        try { sess = JSON.parse(data); } catch { continue; }
        if (sess) sessions.push({ sid, sess, expires });
      }
    } finally {
      statement.free();
    }
    return sessions;
  }

  schedulePersist() {
    if (!this.file || this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistSafely();
    }, PERSIST_DELAY_MS);
    this.persistTimer.unref?.();
  }

  // From a timer a failed write (disk full) must not crash the process; the
  // next change tries again.
  persistSafely() {
    try {
      this.persist();
    } catch (error) {
      console.error('[Sessions] could not write the session store:', error.message);
    }
  }

  persist() {
    if (!this.file || !this.db) return;
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    writeFileAtomicSync(this.file, Buffer.from(this.db.export()));
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
      if (this.ended.has(sid)) return callback?.(null);
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
      this.remove([sid]);
      this.schedulePersist();
      callback?.(null);
    }).catch(error => callback?.(error));
  }

  // Ends every session of one user (a ban). Resolves to the removed sessions'
  // data, so the caller can revoke their Jellyfin tokens as well.
  async destroyByUserId(userId) {
    await this.ready;
    if (!userId) return [];
    const removed = this.liveSessions().filter(entry => entry.sess.userId === userId);
    this.remove(removed.map(entry => entry.sid));
    if (removed.length > 0) this.persist();
    return removed.map(entry => entry.sess);
  }

  // The live sessions of one user, for "Geräte": an id derived from the
  // session id (never the id itself), the device the user logged in with,
  // when, and when it was last used.
  async listByUserId(userId) {
    await this.ready;
    if (!userId) return [];
    return this.liveSessions()
      .filter(entry => entry.sess.userId === userId)
      .map(({ sid, sess, expires }) => ({
        id: publicSessionId(sid),
        sid,
        userAgent: sess.device?.userAgent || null,
        loginAt: sess.device?.loginAt || null,
        lastSeenAt: sess.lastSeenAt || null,
        expires: Number(expires) || null
      }));
  }

  // Every user with a live session (to sign out accounts Jellyfin deleted).
  async liveUserIds() {
    await this.ready;
    return new Set(this.liveSessions().map(entry => entry.sess.userId).filter(Boolean));
  }

  // The public ids of every live session (to drop what belonged to ended ones).
  async livePublicIds() {
    await this.ready;
    return new Set(this.liveSessions().map(entry => publicSessionId(entry.sid)));
  }

  // Ends one session of a user by its public id; answers the session data.
  async destroyOne(userId, publicId) {
    const [ended] = await this.destroyOthers(userId, { only: publicId });
    return ended?.session ?? null;
  }

  // "Alle anderen abmelden" in one pass: ends the user's sessions except
  // `keep` (or only `only`); answers [{ id, session }] of the ended ones.
  async destroyOthers(userId, { keep = null, only = null } = {}) {
    await this.ready;
    if (!userId) return [];
    const ended = this.liveSessions()
      .filter(entry => entry.sess.userId === userId)
      .map(entry => ({ sid: entry.sid, id: publicSessionId(entry.sid), session: entry.sess }))
      .filter(entry => (only ? entry.id === only : entry.id !== keep));
    if (ended.length === 0) return [];
    this.remove(ended.map(entry => entry.sid));
    this.persist();
    return ended.map(({ id, session }) => ({ id, session }));
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
