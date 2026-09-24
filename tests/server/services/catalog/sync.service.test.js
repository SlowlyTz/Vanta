import { describe, it, expect, vi } from 'vitest';
import initSqlJs from 'sql.js';
import { createCatalogDb } from '../../../../src/server/db/catalog.js';
import { createCatalogSync, normalizeText } from '../../../../src/server/services/catalog/sync.service.js';

const SQL = await initSqlJs();

const LIBRARIES = [
  { id: 'lib-movies', name: 'Filme', collectionType: 'movies' },
  { id: 'lib-series', name: 'Serien', collectionType: 'tvshows' }
];

const movie = (id, overrides = {}) => ({
  Id: id,
  Type: 'Movie',
  Name: `Film ${id}`,
  LibraryId: 'lib-movies',
  ProductionYear: 2020,
  DateCreated: '2026-01-01T00:00:00Z',
  Genres: ['Drama', ' Action '],
  Studios: [{ Name: 'Warner Bros.', Id: 's1' }],
  ProviderIds: { Tmdb: '100', Imdb: 'TT0001' },
  RemoteTrailers: [{ Url: 'https://youtu.be/x' }],
  ImageTags: { Primary: 'p' },
  ...overrides
});

const series = (id, overrides = {}) => ({
  Id: id, Type: 'Series', Name: `Serie ${id}`, LibraryId: 'lib-series', Genres: ['Komödie'], ...overrides
});

function setup(items = [], libraries = LIBRARIES, episodeCount = 1444, options = {}) {
  const db = createCatalogDb({ SQL });
  const snapshot = { libraries, items, episodeCount };
  const source = { fetchAll: vi.fn(async () => snapshot) };
  let clock = 1_000;
  const log = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
  const sync = createCatalogSync({ db, source, now: () => (clock += 1), log, ...options });
  return { db, source, sync, snapshot, log };
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const rows = (db, sql, ...params) => db.prepare(sql).all(...params);

describe('normalizeText', () => {
  it('lowercases, trims and collapses whitespace', () => {
    expect(normalizeText('  The   Dark  Knight ')).toBe('the dark knight');
    expect(normalizeText(null)).toBe('');
  });
});

describe('CatalogSync', () => {
  describe('first run', () => {
    it('stores every movie and series with its library, genres and studios', async () => {
      const { db, sync } = setup([movie('m1'), series('s1')]);

      const record = await sync.runFull();

      expect(record).toMatchObject({ type: 'full', added: 2, updated: 0, unchanged: 0, removed: 0, total: 2, error: null });
      expect(rows(db, 'SELECT id, type, library_id, name_normalized, tmdb_id, imdb_id, has_trailer FROM catalog_items ORDER BY id')).toEqual([
        { id: 'm1', type: 'Movie', library_id: 'lib-movies', name_normalized: 'film m1', tmdb_id: '100', imdb_id: 'tt0001', has_trailer: 1 },
        { id: 's1', type: 'Series', library_id: 'lib-series', name_normalized: 'serie s1', tmdb_id: null, imdb_id: null, has_trailer: 0 }
      ]);
      expect(rows(db, 'SELECT genre, genre_normalized FROM catalog_item_genres WHERE item_id = ? ORDER BY genre', 'm1')).toEqual([
        { genre: ' Action ', genre_normalized: 'action' },
        { genre: 'Drama', genre_normalized: 'drama' }
      ]);
      expect(rows(db, 'SELECT studio_normalized FROM catalog_item_studios WHERE item_id = ?', 'm1')).toEqual([{ studio_normalized: 'warner bros.' }]);
      expect(rows(db, 'SELECT id, name, collection_type FROM catalog_libraries ORDER BY id')).toEqual([
        { id: 'lib-movies', name: 'Filme', collection_type: 'movies' },
        { id: 'lib-series', name: 'Serien', collection_type: 'tvshows' }
      ]);
    });

    it('keeps the trimmed Jellyfin item as data so readers can return it unchanged', async () => {
      const { db, sync } = setup([movie('m1')]);
      await sync.runFull();

      const stored = JSON.parse(rows(db, 'SELECT data FROM catalog_items')[0].data);
      expect(stored).toEqual(movie('m1'));
    });

    it('ignores duplicate ids and items without an id', async () => {
      const { sync } = setup([movie('m1'), movie('m1'), { Type: 'Movie', Name: 'ohne Id' }]);

      const record = await sync.runFull();

      expect(record.added).toBe(1);
      expect(record.total).toBe(1);
    });
  });

  describe('repeated runs', () => {
    it('reports unchanged items instead of rewriting them', async () => {
      const { sync } = setup([movie('m1'), movie('m2')]);
      await sync.runFull();

      const record = await sync.runUpdate();

      expect(record).toMatchObject({ type: 'update', added: 0, updated: 0, unchanged: 2 });
    });

    it('detects a changed item and refreshes its genres', async () => {
      const { db, sync, snapshot } = setup([movie('m1')]);
      await sync.runFull();

      snapshot.items = [movie('m1', { Name: 'Neuer Name', Genres: ['Horror'] })];
      const record = await sync.runUpdate();

      expect(record).toMatchObject({ added: 0, updated: 1, unchanged: 0 });
      expect(rows(db, 'SELECT name_normalized FROM catalog_items')[0].name_normalized).toBe('neuer name');
      expect(rows(db, 'SELECT genre FROM catalog_item_genres WHERE item_id = ?', 'm1')).toEqual([{ genre: 'Horror' }]);
    });

    it('adds a new item on an update run without touching the rest', async () => {
      const { sync, snapshot } = setup([movie('m1')]);
      await sync.runFull();

      snapshot.items = [movie('m1'), movie('m2')];
      const record = await sync.runUpdate();

      expect(record).toMatchObject({ added: 1, unchanged: 1, total: 2 });
    });
  });

  describe('removal', () => {
    it('only the full run deletes items that Jellyfin no longer reports', async () => {
      const { db, sync, snapshot } = setup([movie('m1'), movie('m2'), movie('m3')]);
      await sync.runFull();

      snapshot.items = [movie('m1'), movie('m2')];
      const update = await sync.runUpdate();
      expect(update.removed).toBe(0);
      expect(rows(db, 'SELECT COUNT(*) n FROM catalog_items')[0].n).toBe(3);

      const full = await sync.runFull();
      expect(full.removed).toBe(1);
      expect(rows(db, 'SELECT id FROM catalog_items ORDER BY id').map(r => r.id)).toEqual(['m1', 'm2']);
      expect(rows(db, 'SELECT COUNT(*) n FROM catalog_item_genres WHERE item_id = ?', 'm3')[0].n).toBe(0);
    });

    it('refuses to delete anything when Jellyfin returns no items at all', async () => {
      const { db, sync, snapshot, log } = setup([movie('m1'), movie('m2')]);
      await sync.runFull();

      snapshot.items = [];
      const record = await sync.runFull();

      expect(record.removed).toBe(0);
      expect(record.removalSkipped).toMatch(/keine Titel/);
      expect(rows(db, 'SELECT COUNT(*) n FROM catalog_items')[0].n).toBe(2);
      expect(log.warn).toHaveBeenCalled();
    });

    it('refuses to delete when more than half of the catalogue would vanish', async () => {
      const { db, sync, snapshot } = setup([movie('m1'), movie('m2'), movie('m3'), movie('m4')]);
      await sync.runFull();

      snapshot.items = [movie('m1')];
      const record = await sync.runFull();

      expect(record.removed).toBe(0);
      expect(record.removalSkipped).toMatch(/nur 1 von 4/);
      expect(rows(db, 'SELECT COUNT(*) n FROM catalog_items')[0].n).toBe(4);
    });

    it('still deletes when exactly half remains', async () => {
      const { sync, snapshot } = setup([movie('m1'), movie('m2')]);
      await sync.runFull();

      snapshot.items = [movie('m1')];
      const record = await sync.runFull();

      expect(record.removed).toBe(1);
      expect(record.removalSkipped).toBeNull();
    });
  });

  describe('failure handling', () => {
    it('records a failed fetch and leaves the catalogue untouched', async () => {
      const { db, sync, source } = setup([movie('m1')]);
      await sync.runFull();

      source.fetchAll.mockRejectedValueOnce(new Error('jellyfin down'));
      const record = await sync.runUpdate();

      expect(record.error).toBe('jellyfin down');
      expect(rows(db, 'SELECT COUNT(*) n FROM catalog_items')[0].n).toBe(1);
      expect(sync.getStatus().lastRun.error).toBe('jellyfin down');
      expect(sync.getStatus().lastSuccess.type).toBe('full');
    });

    it('rolls back a run that fails while writing', async () => {
      const { db, sync, snapshot } = setup([movie('m1')]);
      await sync.runFull();

      // A row that violates the type CHECK blows up inside the transaction.
      snapshot.items = [movie('m2'), movie('m3', { Type: 'Episode' })];
      const record = await sync.runUpdate();

      expect(record.error).toBeTruthy();
      expect(rows(db, 'SELECT id FROM catalog_items').map(r => r.id)).toEqual(['m1']);
    });
  });

  describe('concurrency and status', () => {
    it('shares one run between overlapping callers', async () => {
      const { sync, source } = setup([movie('m1')]);
      let release;
      source.fetchAll.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));

      const first = sync.runFull();
      const second = sync.runUpdate();
      expect(sync.isRunning()).toBe(true);
      expect(second).toBe(first);

      release({ libraries: LIBRARIES, items: [movie('m1')] });
      const record = await first;

      expect(record.type).toBe('full');
      expect(source.fetchAll).toHaveBeenCalledTimes(1);
      expect(sync.isRunning()).toBe(false);
    });

    it('reports emptiness and counts', async () => {
      const { sync } = setup([movie('m1'), series('s1')]);
      expect(sync.isEmpty()).toBe(true);

      await sync.runFull();

      expect(sync.isEmpty()).toBe(false);
      expect(sync.getStatus()).toMatchObject({
        running: false, itemCount: 2, libraryCount: 2,
        library: { movies: 1, series: 1, episodes: 1444 }
      });
      expect(sync.getStatus().lastRun.durationMs).toBeGreaterThan(0);
    });

    it('keeps the last known episode count when the count call fails', async () => {
      const { sync, snapshot } = setup([movie('m1')]);
      await sync.runFull();

      snapshot.episodeCount = null;
      await sync.runUpdate();

      expect(sync.getStatus().library.episodes).toBe(1444);
    });

    it('reports unknown episodes before any count succeeded', async () => {
      const { sync } = setup([movie('m1')], LIBRARIES, null);
      await sync.runFull();

      expect(sync.getStatus().library.episodes).toBeNull();
    });
  });

  describe('console summary', () => {
    it('logs what changed and what the library holds after every run', async () => {
      const { sync, snapshot, log } = setup([movie('m1'), movie('m2'), movie('m3'), series('s1')]);

      await sync.runFull();
      expect(log.info).toHaveBeenCalledWith(expect.stringMatching(/^\[Catalog\] Vollabgleich: 4 neu \(\d+ ms\)$/));
      expect(log.info).toHaveBeenCalledWith('[Catalog] Bibliothek: 3 Filme, 1 Serien, 1444 Folgen');

      log.info.mockClear();
      await sync.runUpdate();
      expect(log.info).toHaveBeenCalledWith(expect.stringMatching(/^\[Catalog\] Update: keine Änderungen \(\d+ ms\)$/));

      log.info.mockClear();
      // Half of the catalogue stays, so the removal guard lets the two deletions through.
      snapshot.items = [movie('m1', { Name: 'Neu' }), movie('m2')];
      await sync.runFull();
      expect(log.info).toHaveBeenCalledWith(expect.stringMatching(/^\[Catalog\] Vollabgleich: 1 aktualisiert, 2 entfernt \(\d+ ms\)$/));
      expect(log.info).toHaveBeenCalledWith('[Catalog] Bibliothek: 2 Filme, 0 Serien, 1444 Folgen');
    });

    it('says so when the episode count is unknown', async () => {
      const { sync, log } = setup([movie('m1')], LIBRARIES, null);
      await sync.runFull();
      expect(log.info).toHaveBeenCalledWith('[Catalog] Bibliothek: 1 Filme, 0 Serien, Folgen unbekannt');
    });

    it('logs nothing on a failed run', async () => {
      const { sync, source, log } = setup([movie('m1')]);
      source.fetchAll.mockRejectedValueOnce(new Error('down'));
      await sync.runUpdate();
      expect(log.info).not.toHaveBeenCalled();
    });
  });

  describe('afterRun hook', () => {
    it('receives the added and updated items after the summary was logged', async () => {
      const afterRun = vi.fn();
      const { sync, snapshot, log } = setup([movie('m1'), series('s1')], LIBRARIES, 1444, { afterRun });

      const record = await sync.runFull();
      await flush();

      expect(afterRun).toHaveBeenCalledTimes(1);
      expect(afterRun.mock.calls[0][0].record).toBe(record);
      expect(afterRun.mock.calls[0][0].items.map(item => item.Id)).toEqual(['m1', 's1']);
      expect(log.info.mock.invocationCallOrder[0]).toBeLessThan(afterRun.mock.invocationCallOrder[0]);

      snapshot.items = [movie('m1', { Name: 'Neu' }), series('s1'), movie('m2')];
      await sync.runUpdate();
      await flush();

      expect(afterRun).toHaveBeenCalledTimes(2);
      expect(afterRun.mock.calls[1][0].items.map(item => item.Id)).toEqual(['m1', 'm2']);
    });

    it('is called with an empty list when nothing changed and not at all on a failed run', async () => {
      const afterRun = vi.fn();
      const { sync, source } = setup([movie('m1')], LIBRARIES, 1444, { afterRun });

      await sync.runFull();
      await sync.runUpdate();
      await flush();
      expect(afterRun).toHaveBeenCalledTimes(2);
      expect(afterRun.mock.calls[1][0].items).toEqual([]);

      source.fetchAll.mockRejectedValueOnce(new Error('down'));
      await sync.runUpdate();
      await flush();
      expect(afterRun).toHaveBeenCalledTimes(2);
    });

    it('does not let a failing hook affect the run', async () => {
      const afterRun = vi.fn(async () => { throw new Error('Cache kaputt'); });
      const { sync, log } = setup([movie('m1')], LIBRARIES, 1444, { afterRun });

      const record = await sync.runFull();
      await flush();

      expect(record.error).toBeNull();
      expect(sync.isRunning()).toBe(false);
      expect(log.warn).toHaveBeenCalledWith('[CatalogSync] afterRun fehlgeschlagen: Cache kaputt');
    });
  });
});
