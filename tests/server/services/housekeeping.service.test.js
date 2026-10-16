import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryDb } from '../helpers/memoryDb.js';

const memory = await createMemoryDb();
vi.mock('../../../src/server/db/database.js', () => ({ default: memory }));
vi.mock('../../../src/server/config/env.js', () => ({ default: { JELLYFIN_BASE_URL: 'http://jellyfin.test', VAPID_SUBJECT: 'mailto:test@example.com' } }));
vi.mock('../../../src/server/realtime/app.socket.js', () => ({ appSocketHub: { sendToUser: vi.fn() } }));

const { createHousekeeping, PER_USER_TABLES } = await import('../../../src/server/services/housekeeping.service.js');

const fill = (userId) => {
  memory.prepare('INSERT INTO user_preferences (user_id, data, updated_at) VALUES (?, ?, 1)').run(userId, '{}');
  memory.prepare("INSERT INTO watchlist (user_id, item_id, item_type, added_at) VALUES (?, 'm1', 'Movie', 1)").run(userId);
  memory.prepare("INSERT INTO resume_hidden (user_id, series_id, hidden_at) VALUES (?, 's1', 1)").run(userId);
  memory.prepare("INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at) VALUES (?, ?, 'p', 'a', 1)").run(userId, `https://fcm.googleapis.com/fcm/send/${userId}`);
  memory.prepare("INSERT INTO notification_preferences (user_id, kind, push, in_app) VALUES (?, '*', 1, 1)").run(userId);
  memory.prepare("INSERT INTO notifications (user_id, kind, title, body, created_at) VALUES (?, 'announcement', 't', 'b', 1)").run(userId);
};

const count = (table, userId) => memory.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`).get(userId).n;

describe('Housekeeping', () => {
  let deps;
  beforeEach(() => {
    PER_USER_TABLES.forEach(table => memory.exec(`DELETE FROM ${table};`));
    deps = {
      directory: { allIds: vi.fn(async () => new Set(['u1'])) },
      notify: { prune: vi.fn(() => 2) },
      push: { pruneEndedSessions: vi.fn(() => 1) },
      loadSessions: async () => ({ livePublicIds: async () => new Set(['s1']), liveUserIds: async () => new Set(['u1']) }),
      signOutDeleted: vi.fn(async () => {}),
      log: { warn: vi.fn() }
    };
  });

  it('removes what belonged to deleted Jellyfin accounts and keeps the rest', async () => {
    fill('u1');
    fill('gone');
    const result = await createHousekeeping(deps).run();
    expect(result).toEqual({ pruned: 2, deletedUsers: PER_USER_TABLES.length, endedSessions: 1 });
    for (const table of PER_USER_TABLES) {
      expect(count(table, 'gone')).toBe(0);
      expect(count(table, 'u1')).toBe(1);
    }
    expect(deps.push.pruneEndedSessions).toHaveBeenCalledWith(new Set(['s1']));
    expect(deps.directory.allIds).toHaveBeenCalledWith({ fresh: true });
  });

  it('removes nothing when Jellyfin names no users or cannot be asked', async () => {
    fill('u1');
    deps.directory.allIds.mockResolvedValueOnce(new Set());
    expect((await createHousekeeping(deps).run()).deletedUsers).toBe(0);
    deps.directory.allIds.mockRejectedValueOnce(new Error('down'));
    const result = await createHousekeeping(deps).run();
    expect(result.deletedUsers).toBeNull();
    expect(result.pruned).toBe(2);
    expect(count('watchlist', 'u1')).toBe(1);
  });

  it('signs out live sessions of accounts deleted in Jellyfin itself', async () => {
    deps.loadSessions = async () => ({ livePublicIds: async () => new Set(), liveUserIds: async () => new Set(['u1', 'gone']) });
    await createHousekeeping(deps).run();
    expect(deps.signOutDeleted).toHaveBeenCalledTimes(1);
    expect(deps.signOutDeleted).toHaveBeenCalledWith('gone');
  });
});
