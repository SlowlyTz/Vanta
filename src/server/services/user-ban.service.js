import fs from 'fs';
import { writeFileAtomicSync } from '../utils/atomicWrite.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_USER_DB_DIR = join(dirname(dirname(dirname(__dirname))), 'db', 'user');

const emptyBannedList = () => ({ users: [] });

export const BANNED_MESSAGE = 'Dein Konto wurde gesperrt.';

// What a banned user is told, by every API route and the app socket alike;
// the client shows it on the login page.
export const bannedPayload = (ban) => ({
  error: BANNED_MESSAGE,
  code: 'BANNED',
  reason: ban?.reason || null
});

// Every authenticated request asks whether its user is banned, so the list is
// kept in memory. The file is looked at again at most once per `recheckMs`
// and only re-read when it changed, so an edit by hand still takes effect
// within a second; the service's own writes update the copy directly.
export function createUserBanService({ dbDir = DEFAULT_USER_DB_DIR, recheckMs = 1000, now = () => Date.now() } = {}) {
  const bannedFile = join(dbDir, 'banned.json');
  let cached = null; // { list, mtimeMs, checkedAt }

  function loadFromDisk() {
    let stat = null;
    try {
      stat = fs.statSync(bannedFile);
    } catch {
      return { list: emptyBannedList(), mtimeMs: null };
    }
    if (cached && cached.mtimeMs === stat.mtimeMs) return { list: cached.list, mtimeMs: stat.mtimeMs };

    try {
      const parsed = JSON.parse(fs.readFileSync(bannedFile, 'utf8'));
      return { list: { users: Array.isArray(parsed.users) ? parsed.users : [] }, mtimeMs: stat.mtimeMs };
    } catch (error) {
      console.warn('[UserBanService] Could not read banned.json:', error.message);
      // Not cached: the next look reads again instead of keeping an empty list.
      return { list: emptyBannedList(), mtimeMs: null };
    }
  }

  function readBannedList() {
    const time = now();
    if (cached && time - cached.checkedAt < recheckMs) return cached.list;
    const { list, mtimeMs } = loadFromDisk();
    cached = mtimeMs === null ? null : { list, mtimeMs, checkedAt: time };
    return list;
  }

  function writeBannedList(list) {
    writeFileAtomicSync(bannedFile, `${JSON.stringify(list, null, 2)}\n`, { encoding: 'utf8' });
    let mtimeMs = null;
    try { mtimeMs = fs.statSync(bannedFile).mtimeMs; } catch { /* re-read next time */ }
    cached = mtimeMs === null ? null : { list, mtimeMs, checkedAt: now() };
  }

  return {
    getAll() {
      return readBannedList().users;
    },

    getBan(userId) {
      if (!userId) return null;
      return readBannedList().users.find(u => u.userId === userId) || null;
    },

    isBanned(userId) {
      return this.getBan(userId) !== null;
    },

    ban(userId, username, reason, bannedBy = null) {
      if (!userId) {
        const error = new Error('userId is required');
        error.status = 400;
        throw error;
      }

      const trimmedReason = String(reason || '').trim();
      if (!trimmedReason) {
        const error = new Error('Ein Sperrgrund ist erforderlich');
        error.status = 400;
        throw error;
      }

      const list = readBannedList();
      const existingIndex = list.users.findIndex(u => u.userId === userId);
      const entry = {
        userId,
        username: username || null,
        reason: trimmedReason,
        bannedAt: new Date().toISOString(),
        bannedBy: bannedBy ? { userId: bannedBy.userId, username: bannedBy.username } : null
      };

      if (existingIndex >= 0) {
        list.users[existingIndex] = entry;
      } else {
        list.users.push(entry);
      }

      writeBannedList(list);
      return entry;
    },

    unban(userId) {
      const list = readBannedList();
      const nextUsers = list.users.filter(u => u.userId !== userId);
      const changed = nextUsers.length !== list.users.length;

      if (changed) {
        writeBannedList({ users: nextUsers });
      }

      return changed;
    }
  };
}

export const UserBanService = createUserBanService();
