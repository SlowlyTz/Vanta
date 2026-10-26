// The catalogue mirror (db/catalog.db): Jellyfin movies and series in sql.js for
// filtering, sorting and search without asking Jellyfin.
import initSqlJs from 'sql.js';
import { join } from 'path';
import fs from 'fs';
import { writeFileAtomicSync } from '../utils/atomicWrite.js';
import { DB_DIR } from '../config/paths.js';
import { createStatementFactory } from './sqlite.js';

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

  -- Cast and crew per title (first entries only), for the search by person.
  -- The primary key already serves lookups by item.
  CREATE TABLE IF NOT EXISTS catalog_item_people (
    item_id TEXT NOT NULL,
    person_id TEXT NOT NULL,
    name TEXT NOT NULL,
    image_tag TEXT,
    PRIMARY KEY (item_id, person_id)
  );
  DROP INDEX IF EXISTS idx_catalog_people_item;

  CREATE TABLE IF NOT EXISTS catalog_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

// Unlike database.js, statements here never persist on their own: a sync writes
// thousands of rows and must flush to disk exactly once, at the end.
export function createCatalogDb({ SQL, file = null, bytes = null }) {
  const sqlite = bytes ? new SQL.Database(bytes) : new SQL.Database();
  sqlite.exec(SCHEMA);

  const prepare = createStatementFactory(sqlite);

  const persist = () => {
    if (!file) return;
    writeFileAtomicSync(file, Buffer.from(sqlite.export()));
  };

  // Runs `fn` inside one SQLite transaction, so a failure halfway through a
  // sync leaves the previous catalogue untouched. The caller persists.
  const transaction = (fn) => {
    sqlite.exec('BEGIN');
    let result;
    try {
      result = fn();
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
    sqlite.exec('COMMIT');
    return result;
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

