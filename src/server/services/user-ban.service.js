import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_USER_DB_DIR = join(dirname(dirname(dirname(__dirname))), 'db', 'user');

const emptyBannedList = () => ({ users: [] });

export function createUserBanService({ dbDir = DEFAULT_USER_DB_DIR } = {}) {
  const bannedFile = join(dbDir, 'banned.json');

  function readBannedList() {
    if (!fs.existsSync(bannedFile)) return emptyBannedList();

    try {
      const parsed = JSON.parse(fs.readFileSync(bannedFile, 'utf8'));
      return { users: Array.isArray(parsed.users) ? parsed.users : [] };
    } catch (error) {
      console.warn('[UserBanService] Could not read banned.json:', error.message);
      return emptyBannedList();
    }
  }

  function writeBannedList(list) {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const tmpFile = `${bannedFile}.tmp`;
    fs.writeFileSync(tmpFile, `${JSON.stringify(list, null, 2)}\n`, 'utf8');
    fs.renameSync(tmpFile, bannedFile);
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
        const error = new Error('Ban reason is required');
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
