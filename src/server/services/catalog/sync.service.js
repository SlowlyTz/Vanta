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

// Cast and crew go to their own table (for the search by person); the
// stored item stays without them, so pages of cards stay small.
export const MAX_PEOPLE_PER_ITEM = 30;
const PERSON_KINDS = new Set(['Actor', 'Director', 'GuestStar', 'Writer', 'Creator']);

// Each person once (someone who wrote and acted is listed twice by Jellyfin).
export const peopleOf = (item) => {
  const seen = new Set();
  return (Array.isArray(item?.People) ? item.People : [])
    .filter(person => person?.Id && person?.Name && (!person.Type || PERSON_KINDS.has(person.Type)))
    .filter(person => !seen.has(person.Id) && seen.add(person.Id))
    .slice(0, MAX_PEOPLE_PER_ITEM);
};

const withoutPeople = (item) => {
  if (!item || !('People' in item)) return item;
  const { People, ...rest } = item;
  return rest;
};

// What a run compares to tell a changed title from an unchanged one.
const changeKey = (data, peopleIds) => `${data}|${peopleIds}`;
const peopleKeyOf = (item) => peopleOf(item).map(person => person.Id).sort().join(',');

// Fields the mirror started to read later. A stored title without one gets
// it filled in quietly instead of counting as changed, so the first run
// after an update does not report (and notify about) the whole library.
const BACKFILLED_FIELDS = ['DateLastMediaAdded'];

const withoutFields = (item, fields) => {
  const rest = { ...item };
  for (const field of fields) delete rest[field];
  return rest;
};

// Only what is new on the mirror's side differs: fields it did not read
// before, or cast and crew of a title that had none stored yet.
const isBackfill = (previous, item) => {
  const before = JSON.parse(previous.data);
  const missing = BACKFILLED_FIELDS.filter(field => !(field in before) && field in item);
  const data = JSON.stringify(withoutFields(withoutPeople(item), missing));
  if (data !== previous.data) return false;
  return previous.peopleKey === '' || previous.peopleKey === peopleKeyOf(item);
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
  data: JSON.stringify(withoutPeople(item)),
  synced_at: syncedAt
});

const ROW_COLUMNS = Object.keys(toRow({ Id: '', Type: 'Movie', Name: '' }, 0));

// `afterRun` receives the record and the items a successful run added or
// updated (all of them as `items`, and split into `added` and `updated`),
// how many titles the catalogue held before and when the previous successful
// run started; it runs detached so a slow hook never delays the sync.
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
    existingPeople: db.prepare('SELECT item_id, person_id FROM catalog_item_people'),
    deletePeople: db.prepare('DELETE FROM catalog_item_people WHERE item_id = ?'),
    insertPerson: db.prepare('INSERT OR IGNORE INTO catalog_item_people (item_id, person_id, name, image_tag) VALUES (?, ?, ?, ?)'),
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

    statements.deletePeople.run(row.id);
    for (const person of peopleOf(item)) {
      statements.insertPerson.run(row.id, person.Id, person.Name, person.PrimaryImageTag || null);
    }
  };

  const removeItem = (id) => {
    statements.deleteItem.run(id);
    statements.deleteGenres.run(id);
    statements.deleteStudios.run(id);
    statements.deletePeople.run(id);
  };

  // Applies one fetched snapshot. Items are compared by their serialised data so a
  // run reports what actually changed; deletion only happens on a full run and only
  // when the snapshot looks complete.
  const apply = ({ libraries, items }, { removeMissing }) => {
    const syncedAt = now();
    const peopleByItem = new Map();
    for (const row of statements.existingPeople.all()) {
      if (!peopleByItem.has(row.item_id)) peopleByItem.set(row.item_id, []);
      peopleByItem.get(row.item_id).push(row.person_id);
    }
    const knownPeople = new Map([...peopleByItem].map(([id, ids]) => [id, ids.sort().join(',')]));
    const known = new Map(statements.existing.all().map(row => {
      const peopleKey = knownPeople.get(row.id) || '';
      return [row.id, { key: changeKey(row.data, peopleKey), data: row.data, peopleKey }];
    }));
    const seen = new Set();
    const stats = { added: 0, updated: 0, unchanged: 0, removed: 0, removalSkipped: null };
    const changed = [];
    const added = [];
    const updated = [];

    db.transaction(() => {
      statements.clearLibraries.run();
      for (const library of libraries) {
        statements.insertLibrary.run(library.id, library.name, library.collectionType || null);
      }

      for (const item of items) {
        if (!item?.Id || seen.has(item.Id)) continue;
        seen.add(item.Id);

        const previous = known.get(item.Id);
        const next = changeKey(JSON.stringify(withoutPeople(item)), peopleKeyOf(item));
        if (previous === undefined) { stats.added++; added.push(item); }
        else if (previous.key === next) { stats.unchanged++; continue; }
        else if (isBackfill(previous, item)) {
          stats.unchanged++;
          writeItem(item, syncedAt);
          continue;
        } else { stats.updated++; updated.push(item); }

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

    return { stats, changed, added, updated, previousCount: known.size };
  };

  const notifyAfterRun = (record, details) => {
    if (!afterRun) return;
    Promise.resolve()
      .then(() => afterRun({ record, ...details }))
      .catch(error => log.warn?.(`[CatalogSync] afterRun fehlgeschlagen: ${error.message}`));
  };

  // An update run takes over a running one (a full run covers it). A full
  // run asked for while an update runs does not happen: it answers at once
  // with `busy` (the scheduler tries again later).
  let currentType = null;
  const run = (type) => {
    if (current && (type === currentType || currentType === 'full')) return current;
    if (current) return Promise.resolve({ type, busy: true, error: null });
    currentType = type;

    current = (async () => {
      const startedAt = now();
      const record = { type, startedAt, finishedAt: null, durationMs: null, error: null };
      const previousSuccessAt = readMeta('lastSuccess')?.startedAt ?? null;
      let details = { items: [], added: [], updated: [], previousCount: 0, previousSuccessAt };

      try {
        const snapshot = await source.fetchAll();
        const { stats, changed, added, updated, previousCount } = apply(snapshot, { removeMissing: type === 'full' });
        details = { items: changed, added, updated, previousCount, previousSuccessAt };
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
        currentType = null;
        if (!record.error) {
          logSummary(record);
          notifyAfterRun(record, details);
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
    runningType: () => currentType,
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
