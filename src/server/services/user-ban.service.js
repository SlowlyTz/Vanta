// Banned VANTA accounts (db/user/banned.json) and what a banned user is told.
import { createJsonStore } from '../utils/jsonStore.js';
import { join } from 'path';
import { httpError } from '../utils/httpError.js';
import { USER_DB_DIR } from '../config/paths.js';


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
// kept in memory and the file looked at again at most once per `recheckMs`.
export function createUserBanService({ dbDir = USER_DB_DIR, recheckMs = 1000, now = () => Date.now() } = {}) {
  const store = createJsonStore(join(dbDir, 'banned.json'), {
    empty: emptyBannedList,
    parse: parsed => ({ users: Array.isArray(parsed.users) ? parsed.users : [] }),
    recheckMs,
    now,
    label: 'banned.json'
  });
  const readBannedList = () => store.read();
  const writeBannedList = list => store.write(list);

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
        throw httpError(400, 'Kein Nutzer angegeben');
      }

      const trimmedReason = String(reason || '').trim();
      if (!trimmedReason) {
        throw httpError(400, 'Ein Sperrgrund ist erforderlich');
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
