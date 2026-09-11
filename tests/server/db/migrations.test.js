import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs from 'sql.js';
import { migrateRequestsTable } from '../../../src/server/db/migrations.js';

// The 13-column table as it shipped before request scopes existed.
const LEGACY_SCHEMA = `
  CREATE TABLE requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER NOT NULL,
    tmdb_type TEXT NOT NULL CHECK(tmdb_type IN ('movie', 'tv')),
    title TEXT NOT NULL,
    media_type TEXT NOT NULL,
    poster_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'imported', 'rejected')),
    seasons JSON,
    note TEXT DEFAULT '',
    user_id INTEGER,
    username TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

let SQL;
let sqlite;

const columnNames = () => {
  const [result] = sqlite.exec('PRAGMA table_info(requests)');
  const nameIndex = result.columns.indexOf('name');
  return result.values.map(row => row[nameIndex]);
};

const rows = () => {
  const [result] = sqlite.exec('SELECT * FROM requests');
  return result.values.map(values => Object.fromEntries(result.columns.map((c, i) => [c, values[i]])));
};

describe('migrateRequestsTable', () => {
  beforeEach(async () => {
    SQL = SQL || await initSqlJs();
    sqlite = new SQL.Database();
    sqlite.exec(LEGACY_SCHEMA);
    sqlite.run(
      "INSERT INTO requests (tmdb_id, tmdb_type, title, media_type, status, created_at, updated_at) VALUES (?, 'tv', 'Dark', 'tv', 'pending', 1, 1)",
      [70523]
    );
  });

  it('adds the three scope columns to a legacy table', () => {
    const added = migrateRequestsTable(sqlite);

    expect(added).toEqual(['request_scope', 'season_number', 'episode_number']);
    expect(columnNames()).toContain('request_scope');
    expect(columnNames()).toContain('season_number');
    expect(columnNames()).toContain('episode_number');
  });

  it('backfills existing rows with scope "all" and keeps their data', () => {
    migrateRequestsTable(sqlite);

    expect(rows()).toEqual([
      expect.objectContaining({
        tmdb_id: 70523,
        title: 'Dark',
        request_scope: 'all',
        season_number: null,
        episode_number: null
      })
    ]);
  });

  it('is idempotent: a second run adds nothing and touches no data', () => {
    migrateRequestsTable(sqlite);
    const before = rows();

    const added = migrateRequestsTable(sqlite);

    expect(added).toEqual([]);
    expect(columnNames().filter(name => name === 'request_scope')).toHaveLength(1);
    expect(rows()).toEqual(before);
  });

  it('adds only the columns that are still missing', () => {
    sqlite.run('ALTER TABLE requests ADD COLUMN season_number INTEGER');

    expect(migrateRequestsTable(sqlite)).toEqual(['request_scope', 'episode_number']);
  });

  // sql.js allows CHECK on an added column (only PRIMARY KEY and UNIQUE are refused),
  // so the constraint from the CREATE TABLE really does apply to a migrated database.
  it('enforces the scope CHECK constraint after the migration', () => {
    migrateRequestsTable(sqlite);

    expect(() => sqlite.run(
      "INSERT INTO requests (tmdb_id, tmdb_type, title, media_type, request_scope, created_at, updated_at) VALUES (1, 'tv', 'X', 'tv', 'bogus', 1, 1)"
    )).toThrow(/CHECK constraint failed/);
  });

  it('does nothing when the table does not exist yet', () => {
    const empty = new SQL.Database();
    expect(migrateRequestsTable(empty)).toEqual([]);
  });
});
