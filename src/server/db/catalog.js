import initSqlJs from 'sql.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(dirname(dirname(dirname(__dirname))), 'db');
const DB_FILE = join(DB_DIR, 'catalog.db');

// One row per movie or series. The columns exist for filtering and sorting; the
// `data` blob is the trimmed Jellyfin item itself, so readers can hand it to the
// frontend in the shape it already understands without a reverse mapping.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS catalog_libraries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    collection_type TEXT
  );

  CREATE TABLE IF NOT EXISTS catalog_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('Movie', 'Series')),
    library_id TEXT,
    name TEXT NOT NULL,
    sort_name TEXT,
    name_normalized TEXT NOT NULL,
    original_title TEXT,
    production_year INTEGER,
    premiere_date TEXT,
    date_created TEXT,
    community_rating REAL,
    official_rating TEXT,
    runtime_ticks INTEGER,
    tmdb_id TEXT,
    imdb_id TEXT,
    has_trailer INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    synced_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_catalog_items_type ON catalog_items(type);
  CREATE INDEX IF NOT EXISTS idx_catalog_items_library ON catalog_items(library_id);
  CREATE INDEX IF NOT EXISTS idx_catalog_items_created ON catalog_items(date_created);
  CREATE INDEX IF NOT EXISTS idx_catalog_items_name ON catalog_items(name_normalized);
  CREATE INDEX IF NOT EXISTS idx_catalog_items_tmdb ON catalog_items(tmdb_id);
  CREATE INDEX IF NOT EXISTS idx_catalog_items_imdb ON catalog_items(imdb_id);

  CREATE TABLE IF NOT EXISTS catalog_item_genres (
    item_id TEXT NOT NULL,
    genre TEXT NOT NULL,
    genre_normalized TEXT NOT NULL,
    PRIMARY KEY (item_id, genre_normalized)
  );
  CREATE INDEX IF NOT EXISTS idx_catalog_genres ON catalog_item_genres(genre_normalized);

  CREATE TABLE IF NOT EXISTS catalog_item_studios (
    item_id TEXT NOT NULL,
    studio TEXT NOT NULL,
    studio_normalized TEXT NOT NULL,
    PRIMARY KEY (item_id, studio_normalized)
  );
  CREATE INDEX IF NOT EXISTS idx_catalog_studios ON catalog_item_studios(studio_normalized);

  CREATE TABLE IF NOT EXISTS catalog_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

const normalizeParams = (params) => {
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
};

// Unlike database.js, statements here never persist on their own: a sync writes
// thousands of rows and must flush to disk exactly once, at the end.
export function createCatalogDb({ SQL, file = null, bytes = null }) {
  const sqlite = bytes ? new SQL.Database(bytes) : new SQL.Database();
  sqlite.exec(SCHEMA);

  const prepare = (sql) => ({
    run(...params) {
      sqlite.run(sql, normalizeParams(params));
      return { changes: sqlite.getRowsModified() };
    },

    get(...params) {
      return this.all(...params)[0];
    },

    all(...params) {
      const statement = sqlite.prepare(sql);
      const values = normalizeParams(params);

      try {
        if (values.length > 0) statement.bind(values);
        const rows = [];
        while (statement.step()) rows.push(statement.getAsObject());
        return rows;
      } finally {
        statement.free();
      }
    }
  });

  const persist = () => {
    if (!file) return;
    fs.mkdirSync(dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(sqlite.export()));
  };

  // Runs `fn` inside one SQLite transaction and persists only on success, so a
  // failure halfway through a sync leaves the previous catalogue untouched.
  const transaction = (fn) => {
    sqlite.exec('BEGIN');
    try {
      const result = fn();
      sqlite.exec('COMMIT');
      persist();
      return result;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  };

  return {
    prepare,
    exec: (sql) => sqlite.exec(sql),
    transaction,
    persist,
    close: () => sqlite.close()
  };
}

export async function openCatalogDb(file = DB_FILE) {
  const SQL = await initSqlJs();
  const bytes = fs.existsSync(file) ? fs.readFileSync(file) : null;
  return createCatalogDb({ SQL, file, bytes });
}

export const CATALOG_DB_FILE = DB_FILE;
