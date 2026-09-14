import { normalizeText } from './sync.service.js';

const SORTS = {
  sortName: 'sort_name COLLATE NOCASE ASC, name COLLATE NOCASE ASC',
  newest: 'date_created DESC, sort_name COLLATE NOCASE ASC'
};

const MIRRORED_TYPES = new Set(['Movie', 'Series']);

// Only movies and series are mirrored. A request for any other type (e.g.
// Episode) returns null so the caller falls back to Jellyfin instead of
// silently getting an unfiltered count of everything in the mirror.
const parseTypes = (type) => {
  const types = String(type || '').split(',').map(part => part.trim()).filter(Boolean);
  return types.every(part => MIRRORED_TYPES.has(part)) ? types : null;
};

// Read side of the catalogue mirror. Every method takes the caller's visible
// library ids so per-user library access is applied to the mirror the same
// way Jellyfin applies it to its own queries. Results are the stored Jellyfin
// items, so the frontend receives exactly what it did before.
export function createCatalogReader(db) {
  const count = db.prepare('SELECT COUNT(*) AS count FROM catalog_items');

  const rowsToItems = (rows) => rows.map(row => JSON.parse(row.data));

  // Builds the WHERE clause shared by every query. `libraryIds` null means
  // "no restriction" (admins), an empty array means "nothing visible".
  const buildWhere = ({ types = [], libraryIds = null, genre = null, studios = [], withTrailer = false, query = null }) => {
    const clauses = [];
    const params = [];

    if (types.length > 0) {
      clauses.push(`i.type IN (${types.map(() => '?').join(', ')})`);
      params.push(...types);
    }

    if (Array.isArray(libraryIds)) {
      if (libraryIds.length === 0) clauses.push('0');
      else {
        clauses.push(`i.library_id IN (${libraryIds.map(() => '?').join(', ')})`);
        params.push(...libraryIds);
      }
    }

    if (genre) {
      clauses.push('EXISTS (SELECT 1 FROM catalog_item_genres g WHERE g.item_id = i.id AND g.genre_normalized = ?)');
      params.push(normalizeText(genre));
    }

    if (studios.length > 0) {
      clauses.push(`EXISTS (SELECT 1 FROM catalog_item_studios s WHERE s.item_id = i.id AND s.studio_normalized IN (${studios.map(() => '?').join(', ')}))`);
      params.push(...studios.map(normalizeText));
    }

    if (withTrailer) clauses.push('i.has_trailer = 1');

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

  const total = (filters) => {
    const { where, params } = buildWhere(filters);
    return db.prepare(`SELECT COUNT(*) AS count FROM catalog_items i ${where}`).get(...params).count;
  };

  return {
    isReady: () => count.get().count > 0,

    newest: ({ type, libraryIds = null, limit = 24 }) => {
      const types = parseTypes(type);
      if (!types) return null;
      return select({ types, libraryIds }, { sort: 'newest', limit });
    },

    page: ({ type, libraryIds = null, genre = null, studios = [], page = 1, limit = 50 }) => {
      const types = parseTypes(type);
      if (!types) return null;
      const filters = { types, libraryIds, genre, studios };
      return {
        items: select(filters, { limit, offset: (page - 1) * limit }),
        totalRecordCount: total(filters)
      };
    },

    search: ({ query, libraryIds = null, limit = 50 }) =>
      select({ types: ['Movie', 'Series'], libraryIds, query }, { limit }),

    all: ({ libraryIds = null, withTrailer = false, limit = null } = {}) =>
      select({ types: ['Movie', 'Series'], libraryIds, withTrailer }, { limit }),

    // Names only, like Jellyfin's /Genres and /Studios but restricted to what
    // the caller can actually see.
    genres: ({ type, libraryIds = null }) => {
      const types = parseTypes(type);
      if (!types) return null;
      const { where, params } = buildWhere({ types, libraryIds });
      return db.prepare(`
        SELECT g.genre AS Name, COUNT(*) AS count FROM catalog_item_genres g
        JOIN catalog_items i ON i.id = g.item_id ${where}
        GROUP BY g.genre_normalized ORDER BY g.genre COLLATE NOCASE
      `).all(...params).map(row => ({ Name: row.Name }));
    },

    // `ItemCount` says how many visible titles carry the studio, so the
    // publisher page can hide one-off entries.
    studios: ({ libraryIds = null } = {}) => {
      const { where, params } = buildWhere({ libraryIds });
      return db.prepare(`
        SELECT s.studio AS Name, s.studio_normalized AS Id, COUNT(*) AS count FROM catalog_item_studios s
        JOIN catalog_items i ON i.id = s.item_id ${where}
        GROUP BY s.studio_normalized ORDER BY s.studio COLLATE NOCASE
      `).all(...params).map(row => ({ Name: row.Name, Id: row.Id, ItemCount: row.count }));
    },

    byProviderId: ({ tmdbId = null, imdbId = null, type = null, libraryIds = null }) => {
      const filters = buildWhere({ types: parseTypes(type) || [], libraryIds });
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
