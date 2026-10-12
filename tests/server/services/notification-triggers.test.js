import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryDb } from '../helpers/memoryDb.js';

const memory = await createMemoryDb();
vi.mock('../../../src/server/db/database.js', () => ({ default: memory }));
vi.mock('../../../src/server/config/env.js', () => ({ default: { JELLYFIN_BASE_URL: 'http://jellyfin.test', JELLYFIN_API_KEY: 'key' } }));
vi.mock('../../../src/server/realtime/app.socket.js', () => ({ appSocketHub: { sendToUser: vi.fn() } }));

const { createNotificationTriggers, bundleTitles } = await import('../../../src/server/services/notification-triggers.js');
const { APP_VERSION } = await import('../../../src/public/js/shared/version.js');

const USERS = [
  { id: 'u1', isAdmin: false, libraryIds: null },
  { id: 'u2', isAdmin: false, libraryIds: ['lib-kids'] },
  { id: 'a1', isAdmin: true, libraryIds: null }
];

const setup = (fetchJson = vi.fn()) => {
  const notify = { notify: vi.fn(async () => []) };
  const directory = { all: vi.fn(async () => USERS), admins: vi.fn(async () => USERS.filter(u => u.isAdmin)) };
  const store = new Map();
  const settings = { get: k => store.get(k) ?? null, set: (k, v) => store.set(k, v) };
  const triggers = createNotificationTriggers({ notify, directory, fetchJson, settings, now: () => 5_000, log: { warn: vi.fn() } });
  return { notify, triggers, settings, fetchJson };
};

describe('bundleTitles', () => {
  it('names a few titles and counts the rest', () => {
    expect(bundleTitles([{ Name: 'Dune' }])).toBe('Dune');
    expect(bundleTitles([{ Name: 'Dune' }, { Name: 'Heat' }, { Name: 'Ran' }])).toBe('Dune, Heat und Ran');
    expect(bundleTitles([1, 2, 3, 4, 5].map(n => ({ Name: `T${n}` })))).toBe('T1, T2 und 3 weitere');
  });
});

describe('notification triggers', () => {
  beforeEach(() => memory.exec('DELETE FROM requests; DELETE FROM watchlist;'));

  it('tells the requester about a decision', async () => {
    const { notify, triggers } = setup();
    await triggers.requestDecided({ user_id: 'u1', status: 'approved', title: 'Dune' });
    expect(notify.notify).toHaveBeenCalledWith(expect.objectContaining({
      userIds: ['u1'], kind: 'request_update', title: 'Anfrage angenommen', body: 'Deine Anfrage „Dune“ wurde angenommen.'
    }));
  });

  it('tells the admins about new work', async () => {
    const { notify, triggers } = setup();
    await triggers.adminWork({ kind: 'report', username: 'Bob', title: 'Dark', url: '/#/admin/requests' });
    expect(notify.notify).toHaveBeenCalledWith(expect.objectContaining({ userIds: ['a1'], kind: 'admin_new_request', title: 'Neue Meldung von Bob', body: 'Dark' }));
  });

  it('does nothing after the first fill, but after a full sync like after an update', async () => {
    const { notify, triggers } = setup();
    await triggers.catalogRun({ record: { type: 'update' }, added: [{ Id: 'm1', Name: 'Dune' }], previousCount: 0 });
    await triggers.catalogRun({ record: { type: 'full' }, added: [{ Id: 'm1', Name: 'Dune' }], previousCount: 0 });
    expect(notify.notify).not.toHaveBeenCalled();
    await triggers.catalogRun({ record: { type: 'full' }, added: [{ Id: 'm1', Name: 'Dune', LibraryId: 'lib-a' }], previousCount: 10 });
    expect(notify.notify.mock.calls.map(([options]) => options.userIds[0])).toEqual(['u1', 'a1']);
  });

  it('keeps titles above a user\'s parental limit from them', async () => {
    const { notify, triggers } = setup();
    const users = [
      { id: 'kid', isAdmin: false, libraryIds: null, maxAge: 12, blockUnrated: ['Movie'] },
      { id: 'adult', isAdmin: false, libraryIds: null, maxAge: null, blockUnrated: [] }
    ];
    const directory = { all: vi.fn(async () => users) };
    const limited = createNotificationTriggers({ notify, directory, fetchJson: vi.fn(), settings: { get: () => null, set: () => {} }, log: { warn: vi.fn() } });
    await limited.catalogRun({
      record: { type: 'update' },
      previousCount: 10,
      added: [
        { Id: 'm1', Type: 'Movie', Name: 'Heat', LibraryId: 'lib-a', OfficialRating: 'FSK-16' },
        { Id: 'm2', Type: 'Movie', Name: 'Ohne Freigabe', LibraryId: 'lib-a' },
        { Id: 'm3', Type: 'Movie', Name: 'Paddington', LibraryId: 'lib-a', OfficialRating: 'FSK-0' }
      ]
    });
    const bodies = Object.fromEntries(notify.notify.mock.calls.map(([options]) => [options.userIds[0], options.body]));
    expect(bodies).toEqual({ kid: 'Neu: Paddington', adult: 'Neu: Heat, Ohne Freigabe und Paddington' });
  });

  it('looks at many updated series a few at a time', async () => {
    let open = 0;
    let most = 0;
    const fetchJson = vi.fn(async (path) => {
      if (path !== '/Items') return { Items: [] };
      open += 1;
      most = Math.max(most, open);
      await new Promise(resolve => setTimeout(resolve, 1));
      open -= 1;
      return { Items: [] };
    });
    const { triggers } = setup(fetchJson);
    const updated = Array.from({ length: 12 }, (_, n) => ({ Id: `s${n}`, Type: 'Series', Name: `S${n}`, LibraryId: 'lib-a' }));
    await triggers.catalogRun({ record: { type: 'update' }, previousCount: 10, previousSuccessAt: 1, updated });
    expect(fetchJson.mock.calls.filter(([path]) => path === '/Items')).toHaveLength(12);
    expect(most).toBeLessThanOrEqual(4);
  });

  it('marks requests of arrived titles as imported and tells their owners', async () => {
    memory.prepare("INSERT INTO requests (status, user_id, updated_at) VALUES ('approved', 'u1', 0)").run();
    memory.exec("ALTER TABLE requests ADD COLUMN tmdb_id INTEGER; ALTER TABLE requests ADD COLUMN tmdb_type TEXT; ALTER TABLE requests ADD COLUMN title TEXT;");
    memory.exec("UPDATE requests SET tmdb_id = 438631, tmdb_type = 'movie', title = 'Dune'");
    try {
      const { notify, triggers } = setup();
      await triggers.catalogRun({
        record: { type: 'update' },
        previousCount: 10,
        added: [{ Id: 'm1', Type: 'Movie', Name: 'Dune', LibraryId: 'lib-a', ProviderIds: { Tmdb: '438631' } }]
      });
      expect(memory.prepare('SELECT status FROM requests').get().status).toBe('imported');
      expect(notify.notify).toHaveBeenCalledWith(expect.objectContaining({ userIds: ['u1'], kind: 'request_available', url: '/#/item/m1' }));
      // New content: only to users who can see the library, and not again
      // to the requester who just heard it is available.
      const newContent = notify.notify.mock.calls.filter(([options]) => options.kind === 'new_content').map(([options]) => options.userIds[0]);
      expect(newContent).toEqual(['a1']);
    } finally {
      memory.exec('DROP TABLE requests; CREATE TABLE requests (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT NOT NULL, user_id TEXT, updated_at INTEGER NOT NULL);');
    }
  });

  it('tells a requester about the arrival only when they may see the title', async () => {
    memory.exec("ALTER TABLE requests ADD COLUMN tmdb_id INTEGER; ALTER TABLE requests ADD COLUMN tmdb_type TEXT; ALTER TABLE requests ADD COLUMN title TEXT;");
    memory.prepare("INSERT INTO requests (status, user_id, updated_at, tmdb_id, tmdb_type, title) VALUES ('pending', 'u2', 0, 1, 'movie', 'Heat')").run();
    try {
      const { notify, triggers } = setup();
      await triggers.catalogRun({
        record: { type: 'update' },
        previousCount: 10,
        added: [{ Id: 'm1', Type: 'Movie', Name: 'Heat', LibraryId: 'lib-a', ProviderIds: { Tmdb: '1' } }]
      });
      expect(memory.prepare('SELECT status FROM requests').get().status).toBe('imported');
      expect(notify.notify.mock.calls.some(([options]) => options.kind === 'request_available')).toBe(false);
    } finally {
      memory.exec('DROP TABLE requests; CREATE TABLE requests (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT NOT NULL, user_id TEXT, updated_at INTEGER NOT NULL);');
    }
  });

  it('tells about new episodes those who have the series on their list or started it', async () => {
    memory.prepare("INSERT INTO watchlist (user_id, item_id, item_type, added_at) VALUES ('u1', 's1', 'Series', 0)").run();
    const fetchJson = vi.fn(async (path, { query }) => {
      if (path === '/Items') return { Items: [{ Id: 'e9', ParentIndexNumber: 2, IndexNumber: 3, DateCreated: '1970-01-01T00:00:10Z' }, { Id: 'e1', DateCreated: '1970-01-01T00:00:01Z' }] };
      // a1 started it, u2 has no access, u1 has it on the list only.
      if (path === '/Users/a1/Items') return { Items: [{ Id: 's1', RecursiveItemCount: 10, UserData: { UnplayedItemCount: 4 } }] };
      return { Items: [{ Id: query.Ids, RecursiveItemCount: 10, UserData: { UnplayedItemCount: 10 } }] };
    });
    const { notify, triggers } = setup(fetchJson);
    await triggers.catalogRun({
      record: { type: 'update' },
      previousCount: 10,
      previousSuccessAt: 5_000,
      updated: [{ Id: 's1', Type: 'Series', Name: 'Dark', LibraryId: 'lib-a' }]
    });
    const calls = notify.notify.mock.calls.map(([options]) => options);
    expect(calls.map(c => c.userIds[0])).toEqual(['u1', 'a1']);
    expect(calls[0]).toMatchObject({ kind: 'new_episode', title: 'Neue Folge', body: 'Dark S02E03', url: '/#/item/s1' });
  });

  it('announces a new version once, not on the very first start', async () => {
    const { notify, triggers, settings } = setup();
    await triggers.appStarted();
    expect(notify.notify).not.toHaveBeenCalled();

    settings.set('notified_version', '0.99');
    await triggers.appStarted();
    await triggers.appStarted();
    expect(notify.notify).toHaveBeenCalledTimes(1);
    expect(notify.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: 'app_update', title: `VANTA ${APP_VERSION} ist da` }));
  });

  it('never throws', async () => {
    const { notify, triggers } = setup();
    notify.notify.mockRejectedValue(new Error('boom'));
    await expect(triggers.requestDecided({ user_id: 'u1', status: 'rejected', title: 'x' })).resolves.toBeUndefined();
  });
});
