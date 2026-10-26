// There is no migration runner: CREATE TABLE IF NOT EXISTS never touches an existing
// db/requests.db, so a column added to the schema would stay missing forever. Every
// column below is therefore both part of the CREATE TABLE in database.js and patched
// in here. sql.js accepts CHECK on an added column (only PRIMARY KEY and UNIQUE are
// forbidden) and applies the DEFAULT to the rows that already exist.
const REQUEST_COLUMNS = [
  ['request_scope', "TEXT NOT NULL DEFAULT 'all' CHECK(request_scope IN ('all', 'season', 'episode'))"],
  ['season_number', 'INTEGER'],
  ['episode_number', 'INTEGER']
];

const getColumnNames = (sqlite, table) => {
  const result = sqlite.exec(`PRAGMA table_info(${table})`);
  const nameIndex = result[0]?.columns?.indexOf('name') ?? -1;
  if (nameIndex < 0) return new Set();
  return new Set(result[0].values.map(row => row[nameIndex]));
};

// Idempotent: adds only the columns PRAGMA table_info does not report yet.
// Returns the names it actually added, so the caller can skip persisting for a no-op.
export const migrateRequestsTable = (sqlite) => {
  const existing = getColumnNames(sqlite, 'requests');
  if (existing.size === 0) return [];

  const added = [];
  for (const [name, definition] of REQUEST_COLUMNS) {
    if (existing.has(name)) continue;
    sqlite.run(`ALTER TABLE requests ADD COLUMN ${name} ${definition}`);
    added.push(name);
  }

  return added;
};

// Columns added to push_subscriptions after it shipped: the session (public
// id) a device subscribed in, so signing that session out ends its pushes.
const PUSH_SUBSCRIPTION_COLUMNS = [
  ['session_id', 'TEXT']
];

// The same for any table: adds what is missing, answers the names added.
export const addMissingColumns = (sqlite, table, columns) => {
  const existing = getColumnNames(sqlite, table);
  if (existing.size === 0) return [];
  const added = [];
  for (const [name, definition] of columns) {
    if (existing.has(name)) continue;
    sqlite.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    added.push(name);
  }
  return added;
};

export const migratePushSubscriptionsTable = (sqlite) => addMissingColumns(sqlite, 'push_subscriptions', PUSH_SUBSCRIPTION_COLUMNS);

// TMDB ids of movies and series overlap, so the cache is keyed by both. The
// requests table keeps no foreign key to it: a cache row is not a parent.
export const tmdbMediaTable = (name = 'tmdb_media') => `
  CREATE TABLE IF NOT EXISTS ${name} (
    tmdb_id INTEGER NOT NULL,
    tmdb_type TEXT NOT NULL CHECK(tmdb_type IN ('movie', 'tv')),
    title TEXT NOT NULL,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    release_date TEXT,
    first_air_date TEXT,
    media_type TEXT NOT NULL,
    score REAL DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    cached_at INTEGER NOT NULL,
    PRIMARY KEY (tmdb_id, tmdb_type)
  );`;

export const requestsTable = (name = 'requests') => `
  CREATE TABLE IF NOT EXISTS ${name} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER NOT NULL,
    tmdb_type TEXT NOT NULL CHECK(tmdb_type IN ('movie', 'tv')),
    title TEXT NOT NULL,
    media_type TEXT NOT NULL,
    poster_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'imported', 'rejected')),
    seasons JSON,
    request_scope TEXT NOT NULL DEFAULT 'all' CHECK(request_scope IN ('all', 'season', 'episode')),
    season_number INTEGER,
    episode_number INTEGER,
    note TEXT DEFAULT '',
    user_id INTEGER,
    username TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`;

const pragmaRows = (sqlite, pragma) => {
  const [result] = sqlite.exec(`PRAGMA ${pragma}`);
  if (!result) return [];
  return result.values.map(values => Object.fromEntries(result.columns.map((column, i) => [column, values[i]])));
};

// Copies a table into a fresh one built from `createSql` (SQLite cannot
// change keys in place); columns both have are kept.
const rebuildTable = (sqlite, table, createSql) => {
  const columns = pragmaRows(sqlite, `table_info(${table})`).map(row => row.name);
  sqlite.run(createSql(`${table}_new`));
  const kept = pragmaRows(sqlite, `table_info(${table}_new)`).map(row => row.name).filter(name => columns.includes(name)).join(', ');
  sqlite.run(`INSERT OR IGNORE INTO ${table}_new (${kept}) SELECT ${kept} FROM ${table}`);
  const [sequence] = pragmaRows(sqlite, 'table_list').some(row => row.name === 'sqlite_sequence')
    ? sqlite.exec(`SELECT seq FROM sqlite_sequence WHERE name = '${table}'`)
    : [];
  sqlite.run(`DROP TABLE ${table}`);
  sqlite.run(`ALTER TABLE ${table}_new RENAME TO ${table}`);
  // Ids of deleted rows stay used, as before.
  if (sequence) sqlite.run(`UPDATE sqlite_sequence SET seq = MAX(seq, ${Number(sequence.values[0][0])}) WHERE name = '${table}'`);
};

// Databases from before 1.2 keyed tmdb_media by tmdb_id alone and tied
// requests to it. Answers whether anything was rebuilt.
export const migrateTmdbMediaKey = (sqlite) => {
  const keyColumns = pragmaRows(sqlite, 'table_info(tmdb_media)').filter(row => row.pk > 0);
  const mediaNeedsKey = keyColumns.length === 1;
  const requestsHaveForeignKey = pragmaRows(sqlite, 'foreign_key_list(requests)').length > 0;
  if (!mediaNeedsKey && !requestsHaveForeignKey) return false;

  sqlite.run('PRAGMA foreign_keys = OFF');
  sqlite.run('BEGIN');
  try {
    if (mediaNeedsKey) rebuildTable(sqlite, 'tmdb_media', tmdbMediaTable);
    if (requestsHaveForeignKey) rebuildTable(sqlite, 'requests', requestsTable);
    sqlite.run('COMMIT');
  } catch (error) {
    sqlite.run('ROLLBACK');
    throw error;
  } finally {
    sqlite.run('PRAGMA foreign_keys = ON');
  }
  return true;
};

export { REQUEST_COLUMNS, PUSH_SUBSCRIPTION_COLUMNS };
