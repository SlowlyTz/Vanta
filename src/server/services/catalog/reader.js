// Read side of the catalogue mirror, plus the registry of the active reader.
import { normalizeKey as normalizeText } from '../../utils/text.js';
import { normalizeForSearch, ageRating, rankEntries, rankPeople } from './search.js';
import { withinAgeLimit } from './age-limit.js';

const SORTS = {
  sortName: 'sort_name COLLATE NOCASE ASC, name COLLATE NOCASE ASC',
  newest: 'date_created DESC, sort_name COLLATE NOCASE ASC',
  rating: 'community_rating IS NULL, community_rating DESC, date_created DESC'
};

const MIRRORED_TYPES = new Set(['Movie', 'Series']);

// Only movies and series are mirrored. A request for any other type (e.g.
// Episode) returns null so the caller falls back to Jellyfin instead of
// silently getting an unfiltered count of everything in the mirror.
const parseTypes = (type) => {
  const types = String(type || '').split(',').map(part => part.trim()).filter(Boolean);
  return types.every(part => MIRRORED_TYPES.has(part)) ? types : null;
};

// Copies of one title share the type and the TMDB id (the IMDb id when TMDB
// has none); the oldest copy comes first. Films must also run about as long:
// a file Jellyfin identified as the wrong film (the 2020 "Mulan" as the 1998
// one) is no copy and stays a title of its own.
export const RUNTIME_TOLERANCE_TICKS = 5 * 60 * 10_000_000;
const runtimesMatch = (a, b) => `(${a}.type <> 'Movie' OR NULLIF(${a}.runtime_ticks, 0) IS NULL OR NULLIF(${b}.runtime_ticks, 0) IS NULL OR ABS(${a}.runtime_ticks - ${b}.runtime_ticks) <= ${RUNTIME_TOLERANCE_TICKS})`;
const sameTitle = (a, b) => `${a}.type = ${b}.type AND ((${b}.tmdb_id IS NOT NULL AND ${a}.tmdb_id = ${b}.tmdb_id) OR (${b}.tmdb_id IS NULL AND ${b}.imdb_id IS NOT NULL AND ${a}.tmdb_id IS NULL AND ${a}.imdb_id = ${b}.imdb_id)) AND ${runtimesMatch(a, b)}`;

const runtimeOf = (row) => (Number(row.runtime_ticks) > 0 ? Number(row.runtime_ticks) : null);
const runtimesClose = (a, b) => a.type !== 'Movie' || runtimeOf(a) === null || runtimeOf(b) === null
  || Math.abs(runtimeOf(a) - runtimeOf(b)) <= RUNTIME_TOLERANCE_TICKS;

// Rows (oldest first) sharing a provider id, split into the copies of one
// title each: a row joins the first group whose first row it matches.
function clusterCopies(rows) {
  const clusters = new Map();
  for (const row of rows) {
    const key = mergeKeyOf(row);
    if (!key) continue;
    if (!clusters.has(key)) clusters.set(key, []);
    const list = clusters.get(key);
    const cluster = list.find(entry => runtimesClose(entry[0], row));
    if (cluster) cluster.push(row);
    else list.push([row]);
  }
  return clusters;
}
const comesFirst = (a, b) => `(COALESCE(${a}.date_created, '') < COALESCE(${b}.date_created, '') OR (COALESCE(${a}.date_created, '') = COALESCE(${b}.date_created, '') AND ${a}.id < ${b}.id))`;

export const mergeKeyOf = ({ type, tmdb_id: tmdbId, imdb_id: imdbId }) =>
  tmdbId ? `${type}:tmdb:${tmdbId}` : imdbId ? `${type}:imdb:${imdbId}` : null;

// Every method takes the caller's visible library ids and age limit (see age-limit.js), so
// per-user access matches Jellyfin's own queries. Results are the stored Jellyfin items.
export function createCatalogReader(db) {
  const count = db.prepare('SELECT COUNT(*) AS count FROM catalog_items');

  const rowsToItems = (rows) => rows.map(row => JSON.parse(row.data));

  // The ratings the catalogue holds ("FSK-12", "PG-13" …), a few dozen at
  // most: an age limit becomes the list of those it allows.
  let ratingsCache = null;
  const knownRatings = () => {
    const current = signature();
    if (ratingsCache?.signature !== current) {
      ratingsCache = {
        signature: current,
        ratings: db.prepare('SELECT DISTINCT official_rating AS rating FROM catalog_items WHERE official_rating IS NOT NULL').all().map(row => row.rating)
      };
    }
    return ratingsCache.ratings;
  };

  const ageClause = (ageLimit, clauses, params, alias = 'i') => {
    if (!ageLimit) return;
    const allowed = knownRatings().filter(rating => withinAgeLimit(ageLimit, { officialRating: rating }));
    const blocked = ageLimit.blockUnrated || [];
    const rated = allowed.length ? `${alias}.official_rating IN (${allowed.map(() => '?').join(', ')})` : '0';
    const unrated = blocked.length
      ? `(${alias}.official_rating IS NULL AND ${alias}.type NOT IN (${blocked.map(() => '?').join(', ')}))`
      : `${alias}.official_rating IS NULL`;
    clauses.push(`(${rated} OR ${unrated})`);
    params.push(...allowed, ...blocked);
  };

  const libraryClause = (libraryIds, clauses, params, alias = 'i') => {
    if (!Array.isArray(libraryIds)) return;
    if (libraryIds.length === 0) clauses.push('0');
    else {
      clauses.push(`${alias}.library_id IN (${libraryIds.map(() => '?').join(', ')})`);
      params.push(...libraryIds);
    }
  };

  // A title can sit in several libraries (season 1 on one drive, season 2 on
  // another, or the same film twice). Lists show one entry per title: the
  // oldest copy the user can see.
  const mergeClause = (libraryIds, ageLimit, clauses, params) => {
    const visible = [];
    const visibleParams = [];
    libraryClause(libraryIds, visible, visibleParams, 'd');
    ageClause(ageLimit, visible, visibleParams, 'd');
    clauses.push(`NOT EXISTS (SELECT 1 FROM catalog_items d WHERE ${sameTitle('d', 'i')} AND ${comesFirst('d', 'i')}${visible.map(clause => ` AND ${clause}`).join('')})`);
    params.push(...visibleParams);
  };

  // Builds the WHERE clause shared by every query. `libraryIds` null means
  // "no restriction" (admins), an empty array means "nothing visible";
  // `ageLimit` null means no parental limit.
  const buildWhere = ({ types = [], libraryIds = null, ageLimit = null, genre = null, studios = [], withTrailer = false, withBackdrop = false, query = null, merge = true }) => {
    const clauses = [];
    const params = [];

    ageClause(ageLimit, clauses, params);

    if (types.length > 0) {
      clauses.push(`i.type IN (${types.map(() => '?').join(', ')})`);
      params.push(...types);
    }

    libraryClause(libraryIds, clauses, params);
    if (merge) mergeClause(libraryIds, ageLimit, clauses, params);

    if (genre) {
      clauses.push('EXISTS (SELECT 1 FROM catalog_item_genres g WHERE g.item_id = i.id AND g.genre_normalized = ?)');
      params.push(normalizeText(genre));
    }

    if (studios.length > 0) {
      clauses.push(`EXISTS (SELECT 1 FROM catalog_item_studios s WHERE s.item_id = i.id AND s.studio_normalized IN (${studios.map(() => '?').join(', ')}))`);
      params.push(...studios.map(normalizeText));
    }

    if (withTrailer) clauses.push('i.has_trailer = 1');
    if (withBackdrop) clauses.push("json_extract(i.data, '$.BackdropImageTags[0]') IS NOT NULL");

    if (query) {
      // Wildcards in the user's text are matched literally, not interpreted.
      const escaped = normalizeText(query).replace(/[\\%_]/g, match => `\\${match}`);
      clauses.push("(i.name_normalized LIKE ? ESCAPE '\\' OR LOWER(COALESCE(i.original_title, '')) LIKE ? ESCAPE '\\')");
      params.push(`%${escaped}%`, `%${escaped}%`);
    }

    return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
  };

  const select = (filters, { sort = 'sortName', limit = null, offset = 0 } = {}) => {
    const { where, params } = buildWhere(filters);
    const order = SORTS[sort] || SORTS.sortName;
    const limitSql = limit === null ? '' : ` LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
    return rowsToItems(db.prepare(`SELECT i.data FROM catalog_items i ${where} ORDER BY ${order}${limitSql}`).all(...params));
  };

  // The search entries of every title, rebuilt when the catalogue changed.
  let searchIndex = null;
  const signature = () => {
    const row = db.prepare('SELECT COUNT(*) AS count, MAX(synced_at) AS synced FROM catalog_items').get();
    return `${row.count}:${row.synced}`;
  };
  const entries = () => {
    const current = signature();
    if (searchIndex?.signature === current) return searchIndex.entries;
    const genres = new Map();
    for (const row of db.prepare('SELECT item_id, genre FROM catalog_item_genres').all()) {
      if (!genres.has(row.item_id)) genres.set(row.item_id, new Set());
      genres.get(row.item_id).add(normalizeForSearch(row.genre));
    }
    const people = new Map();
    for (const row of db.prepare('SELECT item_id, person_id, name, image_tag FROM catalog_item_people').all()) {
      if (!people.has(row.item_id)) people.set(row.item_id, []);
      people.get(row.item_id).push({ id: row.person_id, name: normalizeForSearch(row.name), displayName: row.name, imageTag: row.image_tag });
    }
    const rows = db.prepare(`SELECT id, type, library_id, name, original_title, production_year, official_rating, community_rating, tmdb_id, imdb_id, runtime_ticks
      FROM catalog_items ORDER BY COALESCE(date_created, '') ASC, id ASC`).all();
    const copyKeys = new Map();
    for (const [key, clusters] of clusterCopies(rows)) {
      clusters.forEach((cluster, index) => cluster.forEach(row => copyKeys.set(row.id, `${key}#${index}`)));
    }
    const list = rows
      .map((row, rank) => ({
        id: row.id,
        type: row.type,
        libraryId: row.library_id,
        mergeKey: copyKeys.get(row.id) || null,
        rank,
        name: normalizeForSearch(row.name),
        original: normalizeForSearch(row.original_title),
        year: row.production_year,
        age: ageRating(row.official_rating),
        officialRating: row.official_rating,
        rating: row.community_rating,
        genres: genres.get(row.id) || new Set(),
        people: people.get(row.id) || []
      }));
    searchIndex = { signature: current, entries: list };
    return list;
  };
  const itemsByIds = (ids) => {
    if (ids.length === 0) return [];
    const rows = db.prepare(`SELECT id, data FROM catalog_items WHERE id IN (${ids.map(() => '?').join(', ')})`).all(...ids);
    const byId = new Map(rows.map(row => [row.id, JSON.parse(row.data)]));
    return ids.map(id => byId.get(id)).filter(Boolean);
  };

  const total = (filters) => {
    const { where, params } = buildWhere(filters);
    return db.prepare(`SELECT COUNT(*) AS count FROM catalog_items i ${where}`).get(...params).count;
  };

  return {
    isReady: () => count.get().count > 0,

    newest: ({ type, libraryIds = null, ageLimit = null, limit = 24 }) => {
      const types = parseTypes(type);
      if (!types) return null;
      return select({ types, libraryIds, ageLimit }, { sort: 'newest', limit });
    },

    page: ({ type, libraryIds = null, ageLimit = null, genre = null, studios = [], page = 1, limit = 50 }) => {
      const types = parseTypes(type);
      if (!types) return null;
      const filters = { types, libraryIds, ageLimit, genre, studios };
      return {
        items: select(filters, { limit, offset: (page - 1) * limit }),
        totalRecordCount: total(filters)
      };
    },

    // Typo-tolerant, also through cast and crew (see search.js).
    search: ({ query, libraryIds = null, ageLimit = null, limit = 50, filters = {} }) =>
      itemsByIds(rankEntries(entries(), { query, filters, libraryIds, ageLimit, limit })),

    searchPeople: ({ query, libraryIds = null, ageLimit = null, limit = 12 }) =>
      rankPeople(entries(), { query, libraryIds, ageLimit, limit }),

    // Per library: how many titles, and the newest few with a poster (for the
    // library access list of the admin area).
    libraryStats: ({ previews = 3 } = {}) => {
      const stats = {};
      for (const row of db.prepare('SELECT library_id, COUNT(*) AS count FROM catalog_items GROUP BY library_id').all()) {
        stats[row.library_id] = { count: row.count, previews: [] };
      }
      for (const item of select({ types: ['Movie', 'Series'], merge: false }, { sort: 'newest' })) {
        const entry = stats[item.LibraryId];
        if (!entry || entry.previews.length >= previews || !item.ImageTags?.Primary) continue;
        entry.previews.push({ id: item.Id, tag: item.ImageTags.Primary });
      }
      return stats;
    },

    // The decades the user's films and series come from (1990, 2000 …),
    // newest first: the search offers only those as a filter.
    decades: ({ libraryIds = null, ageLimit = null } = {}) => {
      const { where, params } = buildWhere({ types: ['Movie', 'Series'], libraryIds, ageLimit });
      const clause = where ? `${where} AND i.production_year IS NOT NULL` : 'WHERE i.production_year IS NOT NULL';
      return db.prepare(`SELECT DISTINCT (i.production_year / 10) * 10 AS decade FROM catalog_items i ${clause} ORDER BY decade DESC`)
        .all(...params)
        .map(row => Number(row.decade))
        .filter(Number.isFinite);
    },

    // Titles with a backdrop for the screensaver: the newest and the best
    // rated ones, in a random order. Only those two short lists are read from
    // the database. `random` is injectable for tests.
    screensaver: ({ libraryIds = null, ageLimit = null, limit = 30, random = Math.random } = {}) => {
      const filters = { types: ['Movie', 'Series'], libraryIds, ageLimit, withBackdrop: true };
      const newest = select(filters, { sort: 'newest', limit });
      const rated = select(filters, { sort: 'rating', limit });
      const byId = new Map([...newest, ...rated].map(item => [item.Id, item]));
      return [...byId.values()]
        .map(item => [random(), item])
        .sort((a, b) => a[0] - b[0])
        .map(([, item]) => item)
        .slice(0, limit);
    },

    all: ({ libraryIds = null, ageLimit = null, withTrailer = false, limit = null } = {}) =>
      select({ types: ['Movie', 'Series'], libraryIds, ageLimit, withTrailer }, { limit }),

    // Names only, like Jellyfin's /Genres and /Studios but restricted to what
    // the caller can actually see.
    genres: ({ type, libraryIds = null, ageLimit = null }) => {
      const types = parseTypes(type);
      if (!types) return null;
      const { where, params } = buildWhere({ types, libraryIds, ageLimit });
      return db.prepare(`
        SELECT g.genre AS Name, COUNT(*) AS count FROM catalog_item_genres g
        JOIN catalog_items i ON i.id = g.item_id ${where}
        GROUP BY g.genre_normalized ORDER BY g.genre COLLATE NOCASE
      `).all(...params).map(row => ({ Name: row.Name }));
    },

    // `ItemCount` says how many visible titles carry the studio, so the
    // publisher page can hide one-off entries.
    studios: ({ libraryIds = null, ageLimit = null } = {}) => {
      const { where, params } = buildWhere({ libraryIds, ageLimit });
      return db.prepare(`
        SELECT s.studio AS Name, s.studio_normalized AS Id, COUNT(*) AS count FROM catalog_item_studios s
        JOIN catalog_items i ON i.id = s.item_id ${where}
        GROUP BY s.studio_normalized ORDER BY s.studio COLLATE NOCASE
      `).all(...params).map(row => ({ Name: row.Name, Id: row.Id, ItemCount: row.count }));
    },

    // What access to a movie or series depends on; undefined when the
    // catalogue does not know the id.
    accessOf: (itemId) => {
      const rows = db.prepare('SELECT library_id, type, official_rating FROM catalog_items WHERE id = ?').all(String(itemId));
      if (rows.length === 0) return undefined;
      return { libraryId: rows[0].library_id ?? null, type: rows[0].type, officialRating: rows[0].official_rating ?? null };
    },

    // Every copy of the title `itemId` the caller can see, first copy first
    // (see mergeClause); empty when the catalogue does not know the id.
    copiesOf: (itemId, { libraryIds = null, ageLimit = null } = {}) => {
      const clauses = [];
      const params = [String(itemId)];
      libraryClause(libraryIds, clauses, params, 'd');
      ageClause(ageLimit, clauses, params, 'd');
      return db.prepare(`
        SELECT d.id, d.type, d.library_id FROM catalog_items i
        JOIN catalog_items d ON d.id = i.id OR (${sameTitle('d', 'i')})
        WHERE i.id = ?${clauses.map(clause => ` AND ${clause}`).join('')}
        ORDER BY COALESCE(d.date_created, '') ASC, d.id ASC
      `).all(...params).map(row => ({ id: row.id, type: row.type, libraryId: row.library_id }));
    },

    // Titles held more than once across all libraries, with the library
    // names: what the admin's duplicate check looks at. `mismatch` marks rows
    // sharing a provider id but not the runtime (likely identified wrongly).
    titleGroups: () => {
      const libraries = new Map(db.prepare('SELECT id, name FROM catalog_libraries').all().map(row => [row.id, row.name]));
      const rows = db.prepare(`SELECT id, type, name, production_year, library_id, tmdb_id, imdb_id, runtime_ticks FROM catalog_items
        ORDER BY COALESCE(date_created, '') ASC, id ASC`).all();
      const describe = (key, list, mismatch) => ({
        key,
        type: list[0].type,
        name: list[0].name,
        year: list[0].production_year ?? null,
        mismatch,
        copies: list.map(row => ({ id: row.id, libraryId: row.library_id, libraryName: libraries.get(row.library_id) || null }))
      });
      const groups = [];
      for (const [key, clusters] of clusterCopies(rows)) {
        if (clusters.length > 1) groups.push(describe(key, clusters.flat(), true));
        else if (clusters[0].length > 1) groups.push(describe(key, clusters[0], false));
      }
      return groups;
    },

    byProviderId: ({ tmdbId = null, imdbId = null, type = null, libraryIds = null, ageLimit = null }) => {
      const filters = buildWhere({ types: parseTypes(type) || [], libraryIds, ageLimit, merge: false });
      const clauses = [];
      const params = [...filters.params];
      if (tmdbId) { clauses.push('i.tmdb_id = ?'); params.push(String(tmdbId)); }
      if (imdbId) { clauses.push('i.imdb_id = ?'); params.push(String(imdbId).toLowerCase()); }
      if (clauses.length === 0) return [];
      const where = `${filters.where ? `${filters.where} AND` : 'WHERE'} (${clauses.join(' OR ')})`;
      return rowsToItems(db.prepare(`SELECT i.data FROM catalog_items i ${where}`).all(...params));
    }
  };
}

// The catalogue registers its reader here once it is open; LibraryService asks
// for it on every call and falls back to Jellyfin while there is none.
let activeReader = null;

export const setActiveCatalogReader = (reader) => { activeReader = reader; };
export const getActiveCatalogReader = () => (activeReader && activeReader.isReady() ? activeReader : null);
