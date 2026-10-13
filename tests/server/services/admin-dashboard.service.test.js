import { describe, it, expect, vi } from 'vitest';
import { createMemoryDb } from '../helpers/memoryDb.js';

const memory = await createMemoryDb();
vi.mock('../../../src/server/db/database.js', () => ({ default: memory }));
vi.mock('../../../src/server/config/env.js', () => ({ default: { JELLYFIN_BASE_URL: 'http://jellyfin.test', JELLYFIN_API_KEY: 'key' } }));
vi.mock('../../../src/server/services/catalog/index.js', () => ({ getCatalog: vi.fn() }));
vi.mock('../../../src/server/services/images/image-cache.js', () => ({ getImageCache: vi.fn() }));
vi.mock('../../../src/server/services/watch-party.service.js', () => ({ WatchPartyService: { parties: new Map() } }));
vi.mock('../../../src/server/services/user-ban.service.js', () => ({ UserBanService: { getAll: () => [] } }));

const { createAdminDashboard, describeStream } = await import('../../../src/server/services/admin-dashboard.service.js');

describe('describeStream', () => {
  it('names user, title, device, progress and how it plays', () => {
    expect(describeStream({
      UserName: 'Bob', Client: 'VANTA', DeviceName: 'Firefox',
      NowPlayingItem: { Id: 'e1', Name: 'Pilot', SeriesName: 'Dark', RunTimeTicks: 100 },
      PlayState: { PositionTicks: 25, PlayMethod: 'Transcode' },
      TranscodingInfo: { Height: 720, Bitrate: 4_000_000 }
    })).toEqual({ user: 'Bob', title: 'Dark · Pilot', itemId: 'e1', device: 'VANTA · Firefox', progress: 0.25, paused: false, transcoding: true, quality: '720p', bitrate: 4_000_000 });
  });
});

describe('admin dashboard', () => {
  it('gathers every part and survives a missing Jellyfin', async () => {
    memory.exec("DELETE FROM requests; DELETE FROM reports;");
    memory.prepare("INSERT INTO requests (status, user_id, updated_at) VALUES ('pending', 'u1', 1)").run();
    const dashboard = createAdminDashboard({
      fetchJson: vi.fn(async () => { throw new Error('down'); }),
      ping: vi.fn(async () => { throw new Error('down'); }),
      catalog: async () => ({
        sync: { getStatus: () => ({ library: { movies: 3, series: 1, episodes: 9 }, running: false, lastRun: { type: 'update', finishedAt: 5 } }) },
        scheduler: { getPlan: () => ({ nextUpdateAt: 99 }) }
      }),
      images: () => ({ stats: () => ({ files: 2, bytes: 100, maxBytes: 1000 }) }),
      parties: () => [{ id: 'p', itemSnapshot: { name: 'Dune' }, ownerName: 'Ann', status: 'playing', members: new Map([['a', {}], ['b', {}]]) }],
      bans: () => [{ username: 'x', reason: 'r', bannedAt: '2026-01-01' }],
      logins: () => ({ successes: 1, failures: 0, locks: 0, activeLocks: 0 }),
      now: () => 10_000,
      startedAt: 0
    });

    // The recent-requests query asks for columns the memory db does not
    // have; the real schema has them.
    memory.exec('ALTER TABLE requests ADD COLUMN title TEXT; ALTER TABLE requests ADD COLUMN username TEXT; ALTER TABLE requests ADD COLUMN created_at INTEGER;');
    try {
      const data = await dashboard.read();
      expect(data.server).toMatchObject({ uptimeSeconds: 10, jellyfin: { ok: false, latencyMs: null } });
      expect(data.streams).toEqual({ available: false, list: [], direct: 0, transcoding: 0 });
      expect(data.work).toEqual({ requests: 1, reports: 0 });
      expect(data.catalog).toMatchObject({ library: { movies: 3 }, nextUpdateAt: 99 });
      expect(data.storage.imageCache).toEqual({ files: 2, bytes: 100, maxBytes: 1000 });
      expect(data.parties).toEqual([{ id: 'p', title: 'Dune', owner: 'Ann', status: 'playing', members: 2 }]);
      expect(data.activity.bans).toEqual([{ username: 'x', reason: 'r', bannedAt: '2026-01-01' }]);
    } finally {
      memory.exec('DROP TABLE requests; CREATE TABLE requests (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT NOT NULL, user_id TEXT, updated_at INTEGER NOT NULL);');
    }
  });
});
