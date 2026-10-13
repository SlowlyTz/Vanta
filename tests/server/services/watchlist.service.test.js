import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryDb } from '../helpers/memoryDb.js';

const memory = await createMemoryDb();
vi.mock('../../../src/server/db/database.js', () => ({ default: memory }));
vi.mock('../../../src/server/config/env.js', () => ({ default: { JELLYFIN_BASE_URL: 'http://jellyfin.test' } }));

const { createWatchlistService, isFinishedSinceAdded, MAX_ENTRIES } = await import('../../../src/server/services/watchlist.service.js');

const ITEMS = {
  m1: { Id: 'm1', Type: 'Movie', Name: 'Dune' },
  s1: { Id: 's1', Type: 'Series', Name: 'Dark' },
  e1: { Id: 'e1', Type: 'Episode', Name: 'Pilot' }
};

describe('WatchlistService', () => {
  let time;
  let fetchJson;
  let service;

  beforeEach(() => {
    memory.exec('DELETE FROM watchlist;');
    time = 1_000;
    fetchJson = vi.fn(async (path, { query } = {}) => {
      if (path.endsWith('/Items')) return { Items: query.Ids.split(',').map(id => ITEMS[id]).filter(Boolean) };
      const id = path.split('/').pop();
      if (!ITEMS[id]) throw Object.assign(new Error('nope'), { status: 404 });
      return ITEMS[id];
    });
    service = createWatchlistService({ fetchJson, now: () => time });
  });

  it('adds movies and series, newest first', async () => {
    await service.add('u1', 't', 'm1');
    time = 2_000;
    await service.add('u1', 't', 's1');
    await service.add('u1', 't', 's1');

    expect(service.ids('u1')).toEqual(['s1', 'm1']);
    expect((await service.list('u1', 't')).map(item => item.Id)).toEqual(['s1', 'm1']);
    expect(service.ids('u2')).toEqual([]);
  });

  it('refuses episodes and unknown titles', async () => {
    await expect(service.add('u1', 't', 'e1')).rejects.toMatchObject({ status: 400 });
    await expect(service.add('u1', 't', 'zz')).rejects.toMatchObject({ status: 404 });
  });

  it('removes an entry', async () => {
    await service.add('u1', 't', 'm1');
    expect(service.remove('u1', 'm1')).toBe(true);
    expect(service.remove('u1', 'm1')).toBe(false);
    expect(service.ids('u1')).toEqual([]);
  });

  it('takes titles the user can no longer see off the list', async () => {
    await service.add('u1', 't', 'm1');
    await service.add('u1', 't', 's1');
    delete ITEMS.m1;
    try {
      expect((await service.list('u1', 't')).map(item => item.Id)).toEqual(['s1']);
      expect(service.ids('u1')).toEqual(['s1']);
    } finally {
      ITEMS.m1 = { Id: 'm1', Type: 'Movie', Name: 'Dune' };
    }
  });

  it('asks Jellyfin in blocks of ids, and keeps the list when Jellyfin fails', async () => {
    const insert = memory.prepare("INSERT INTO watchlist (user_id, item_id, item_type, added_at) VALUES ('u1', ?, 'Movie', ?)");
    for (let n = 0; n < 250; n++) insert.run(`x${n}`, n);
    fetchJson.mockImplementation(async (path, { query }) => ({ Items: query.Ids.split(',').map(id => ({ Id: id, Type: 'Movie' })) }));
    expect(await service.list('u1', 't')).toHaveLength(250);
    expect(fetchJson.mock.calls.map(([, { query }]) => query.Ids.split(',').length)).toEqual([100, 100, 50]);

    fetchJson.mockRejectedValue(new Error('down'));
    await expect(service.list('u1', 't')).rejects.toThrow('down');
    expect(service.ids('u1')).toHaveLength(250);
  });

  it('adds a title already on a full list without complaint, and nothing new', async () => {
    const insert = memory.prepare("INSERT INTO watchlist (user_id, item_id, item_type, added_at) VALUES ('u1', ?, 'Movie', ?)");
    insert.run('m1', 0);
    for (let n = 1; n < MAX_ENTRIES; n++) insert.run(`x${n}`, n);
    await expect(service.add('u1', 't', 'm1')).resolves.toEqual({ id: 'm1', type: 'Movie' });
    await expect(service.add('u1', 't', 's1')).rejects.toMatchObject({ status: 409 });
  });

  it('takes a film off once it was watched to the end after adding it', async () => {
    time = Date.parse('2026-10-01T00:00:00Z');
    await service.add('u1', 't', 'm1');
    ITEMS.m1.UserData = { Played: true, LastPlayedDate: '2026-10-02T00:00:00Z' };
    try {
      expect(await service.list('u1', 't')).toEqual([]);
      expect(service.ids('u1')).toEqual([]);
    } finally {
      delete ITEMS.m1.UserData;
    }
  });
});

describe('isFinishedSinceAdded', () => {
  const added = Date.parse('2026-10-01T00:00:00Z');
  it('keeps a film watched before it was added, and every series', () => {
    expect(isFinishedSinceAdded({ Type: 'Movie', UserData: { Played: true, LastPlayedDate: '2026-09-01T00:00:00Z' } }, added)).toBe(false);
    expect(isFinishedSinceAdded({ Type: 'Series', UserData: { Played: true, LastPlayedDate: '2026-10-05T00:00:00Z' } }, added)).toBe(false);
    expect(isFinishedSinceAdded({ Type: 'Movie', UserData: { Played: false } }, added)).toBe(false);
  });
});
