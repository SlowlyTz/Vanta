// Below this share of the current catalogue a full sync refuses to delete: a
// half-answered or empty Jellyfin response must never wipe the mirror.
const MIN_RETAIN_RATIO = 0.5;

export const normalizeText = (value) => String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

// Two lines per run: what changed, and what the library holds now. Shared by
// the server log and the `npm run refresh` command.
export const formatRunSummary = (record) => {
  const label = record.type === 'full' ? 'Vollabgleich' : 'Update';
  if (record.error) return [`[Catalog] ${label} fehlgeschlagen: ${record.error}`];

  const changes = [];
  if (record.added) changes.push(`${record.added} neu`);
  if (record.updated) changes.push(`${record.updated} aktualisiert`);
  if (record.removed) changes.push(`${record.removed} entfernt`);

  const { movies = 0, series = 0, episodes = null } = record.library || {};
  const episodesText = episodes === null ? 'Folgen unbekannt' : `${episodes} Folgen`;

  return [
    changes.length
      ? `[Catalog] ${label}: ${changes.join(', ')} (${record.durationMs} ms)`
      : `[Catalog] ${label}: keine Änderungen (${record.durationMs} ms)`,
    `[Catalog] Bibliothek: ${movies} Filme, ${series} Serien, ${episodesText}`
  ];
};

const toRow = (item, syncedAt) => ({
  id: item.Id,
  type: item.Type,
  library_id: item.LibraryId || null,
  name: item.Name || '',
  sort_name: item.SortName || null,
  name_normalized: normalizeText(item.Name),
  original_title: item.OriginalTitle || null,
  production_year: Number.isFinite(item.ProductionYear) ? item.ProductionYear : null,
  premiere_date: item.PremiereDate || null,
  date_created: item.DateCreated || null,
  community_rating: Number.isFinite(item.CommunityRating) ? item.CommunityRating : null,
  official_rating: item.OfficialRating || null,
  runtime_ticks: Number.isFinite(item.RunTimeTicks) ? item.RunTimeTicks : null,
  tmdb_id: item.ProviderIds?.Tmdb ? String(item.ProviderIds.Tmdb) : null,
  imdb_id: item.ProviderIds?.Imdb ? String(item.ProviderIds.Imdb).toLowerCase() : null,
  has_trailer: Array.isArray(item.RemoteTrailers) && item.RemoteTrailers.length > 0 ? 1 : 0,
  data: JSON.stringify(item),
  synced_at: syncedAt
});

const ROW_COLUMNS = Object.keys(toRow({ Id: '', Type: 'Movie', Name: '' }, 0));

// `afterRun` receives the record and the items a successful run added or
// updated; it runs detached so a slow hook (image warm-up) never delays the sync.
export function createCatalogSync({ db, source, now = Date.now, log = console, afterRun = null }) {
  const statements = {
    existing: db.prepare('SELECT id, data FROM catalog_items'),
    upsert: db.prepare(`
      INSERT OR REPLACE INTO catalog_items (${ROW_COLUMNS.join(', ')})
      VALUES (${ROW_COLUMNS.map(() => '?').join(', ')})
    `),
    deleteItem: db.prepare('DELETE FROM catalog_items WHERE id = ?'),
    deleteGenres: db.prepare('DELETE FROM catalog_item_genres WHERE item_id = ?'),
    insertGenre: db.prepare('INSERT OR IGNORE INTO catalog_item_genres (item_id, genre, genre_normalized) VALUES (?, ?, ?)'),
    deleteStudios: db.prepare('DELETE FROM catalog_item_studios WHERE item_id = ?'),
    insertStudio: db.prepare('INSERT OR IGNORE INTO catalog_item_studios (item_id, studio, studio_normalized) VALUES (?, ?, ?)'),
    clearLibraries: db.prepare('DELETE FROM catalog_libraries'),
    insertLibrary: db.prepare('INSERT INTO catalog_libraries (id, name, collection_type) VALUES (?, ?, ?)'),
    countItems: db.prepare('SELECT COUNT(*) AS count FROM catalog_items'),
    countByType: db.prepare('SELECT type, COUNT(*) AS count FROM catalog_items GROUP BY type'),
    countLibraries: db.prepare('SELECT COUNT(*) AS count FROM catalog_libraries'),
    getMeta: db.prepare('SELECT value FROM catalog_meta WHERE key = ?'),
    setMeta: db.prepare('INSERT OR REPLACE INTO catalog_meta (key, value) VALUES (?, ?)')
  };

  let current = null;

  const readMeta = (key) => {
    const row = statements.getMeta.get(key);
    return row ? JSON.parse(row.value) : null;
  };

  const writeMeta = (key, value) => statements.setMeta.run(key, JSON.stringify(value));

  const libraryCounts = () => {
    const byType = Object.fromEntries(statements.countByType.all().map(row => [row.type, row.count]));
    const stored = readMeta('library');
    return {
      movies: byType.Movie || 0,
      series: byType.Series || 0,
      episodes: stored?.episodes ?? null
    };
  };

  // What the console (and pm2 logs) show after each scheduled run.
  const logSummary = (record) => {
    formatRunSummary(record).forEach(line => log.info?.(line));
  };

  const writeItem = (item, syncedAt) => {
    const row = toRow(item, syncedAt);
    statements.upsert.run(ROW_COLUMNS.map(column => row[column]));

    statements.deleteGenres.run(row.id);
    for (const genre of item.Genres || []) {
      if (genre) statements.insertGenre.run(row.id, genre, normalizeText(genre));
    }

    statements.deleteStudios.run(row.id);
    for (const studio of item.Studios || []) {
      const name = typeof studio === 'string' ? studio : studio?.Name;
      if (name) statements.insertStudio.run(row.id, name, normalizeText(name));
    }
  };

  const removeItem = (id) => {
    statements.deleteItem.run(id);
    statements.deleteGenres.run(id);
    statements.deleteStudios.run(id);
  };

  // Applies one fetched snapshot. Items are compared by their serialised data so a
  // run reports what actually changed; deletion only happens on a full run and only
  // when the snapshot looks complete.
  const apply = ({ libraries, items }, { removeMissing }) => {
    const syncedAt = now();
    const known = new Map(statements.existing.all().map(row => [row.id, row.data]));
    const seen = new Set();
    const stats = { added: 0, updated: 0, unchanged: 0, removed: 0, removalSkipped: null };
    const changed = [];

    db.transaction(() => {
      statements.clearLibraries.run();
      for (const library of libraries) {
        statements.insertLibrary.run(library.id, library.name, library.collectionType || null);
      }

      for (const item of items) {
        if (!item?.Id || seen.has(item.Id)) continue;
        seen.add(item.Id);

        const previous = known.get(item.Id);
        const next = JSON.stringify(item);
        if (previous === undefined) stats.added++;
        else if (previous === next) { stats.unchanged++; continue; }
        else stats.updated++;

        writeItem(item, syncedAt);
        changed.push(item);
      }

      if (removeMissing) {
        const missing = [...known.keys()].filter(id => !seen.has(id));
        const retained = known.size - missing.length;

        if (known.size > 0 && seen.size === 0) {
          stats.removalSkipped = 'Jellyfin lieferte keine Titel';
        } else if (known.size > 0 && retained / known.size < MIN_RETAIN_RATIO) {
          stats.removalSkipped = `Jellyfin lieferte nur ${retained} von ${known.size} bekannten Titeln`;
        } else {
          missing.forEach(removeItem);
          stats.removed = missing.length;
        }
      }
    });

    return { stats, changed };
  };

  const notifyAfterRun = (record, changed) => {
    if (!afterRun) return;
    Promise.resolve()
      .then(() => afterRun({ record, items: changed }))
      .catch(error => log.warn?.(`[CatalogSync] afterRun fehlgeschlagen: ${error.message}`));
  };

  const run = (type) => {
    if (current) return current;

    current = (async () => {
      const startedAt = now();
      const record = { type, startedAt, finishedAt: null, durationMs: null, error: null };
      let changed = [];

      try {
        const snapshot = await source.fetchAll();
        const { stats, changed: changedItems } = apply(snapshot, { removeMissing: type === 'full' });
        changed = changedItems;
        if (Number.isFinite(snapshot.episodeCount)) writeMeta('library', { episodes: snapshot.episodeCount });
        Object.assign(record, stats, { total: statements.countItems.get().count, library: libraryCounts() });

        if (stats.removalSkipped) log.warn(`[CatalogSync] Löschung übersprungen: ${stats.removalSkipped}`);
      } catch (error) {
        record.error = error.message || String(error);
        log.error(`[CatalogSync] ${type} run failed:`, error.message);
      } finally {
        record.finishedAt = now();
        record.durationMs = record.finishedAt - startedAt;
        // Runs outside the data transaction on purpose: a failed run must still be recorded.
        writeMeta('lastRun', record);
        if (!record.error) writeMeta('lastSuccess', record);
        db.persist();
        current = null;
        if (!record.error) {
          logSummary(record);
          notifyAfterRun(record, changed);
        }
      }

      return record;
    })();

    return current;
  };

  return {
    runUpdate: () => run('update'),
    runFull: () => run('full'),
    isRunning: () => current !== null,
    isEmpty: () => statements.countItems.get().count === 0,
    getStatus: () => ({
      running: current !== null,
      itemCount: statements.countItems.get().count,
      libraryCount: statements.countLibraries.get().count,
      library: libraryCounts(),
      lastRun: readMeta('lastRun'),
      lastSuccess: readMeta('lastSuccess')
    })
  };
}
