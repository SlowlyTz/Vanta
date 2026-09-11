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

export { REQUEST_COLUMNS };
