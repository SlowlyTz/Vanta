import { describe, it, expect, beforeEach } from 'vitest';
import initSqlJs from 'sql.js';
import { migrateRequestsTable, migratePushSubscriptionsTable, migrateTmdbMediaKey, requestsTable, tmdbMediaTable } from '../../../src/server/db/migrations.js';

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

describe('migratePushSubscriptionsTable', () => {
  it('adds the session column to a table from before it, once', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.run(`CREATE TABLE push_subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL, auth TEXT NOT NULL, user_agent TEXT, created_at INTEGER NOT NULL, last_success_at INTEGER,
      failure_count INTEGER NOT NULL DEFAULT 0)`);
    db.run("INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at) VALUES ('u1', 'https://x', 'p', 'a', 1)");

    expect(migratePushSubscriptionsTable(db)).toEqual(['session_id']);
    expect(migratePushSubscriptionsTable(db)).toEqual([]);
    expect(db.exec('SELECT session_id FROM push_subscriptions')[0].values).toEqual([[null]]);
    expect(migratePushSubscriptionsTable(new SQL.Database())).toEqual([]);
  });
});

describe('migrateTmdbMediaKey', () => {
  const OLD_SCHEMA = `
    CREATE TABLE tmdb_media (tmdb_id INTEGER PRIMARY KEY, tmdb_type TEXT NOT NULL, title TEXT NOT NULL, overview TEXT,
      poster_path TEXT, backdrop_path TEXT, release_date TEXT, first_air_date TEXT, media_type TEXT NOT NULL,
      score REAL DEFAULT 0, vote_count INTEGER DEFAULT 0, cached_at INTEGER NOT NULL);
    ${requestsTable().replace(/\);\s*$/, ', FOREIGN KEY (tmdb_id) REFERENCES tmdb_media(tmdb_id));')}
  `;

  beforeEach(async () => {
    SQL = SQL || await initSqlJs();
    sqlite = new SQL.Database();
    sqlite.run('PRAGMA foreign_keys = ON');
  });

  it('keys the cache by id and type, drops the foreign key and keeps all rows', () => {
    sqlite.exec(OLD_SCHEMA);
    sqlite.run("INSERT INTO tmdb_media (tmdb_id, tmdb_type, title, media_type, cached_at) VALUES (123, 'movie', 'Film', 'movie', 1)");
    sqlite.run("INSERT INTO requests (tmdb_id, tmdb_type, title, media_type, created_at, updated_at) VALUES (123, 'movie', 'Film', 'movie', 1, 1)");

    expect(migrateTmdbMediaKey(sqlite)).toBe(true);
    sqlite.run("INSERT INTO tmdb_media (tmdb_id, tmdb_type, title, media_type, cached_at) VALUES (123, 'tv', 'Serie', 'tv', 2)");

    expect(sqlite.exec('SELECT COUNT(*) FROM tmdb_media')[0].values[0][0]).toBe(2);
    expect(rows()).toHaveLength(1);
    expect(sqlite.exec('PRAGMA foreign_key_list(requests)')).toEqual([]);
    expect(migrateTmdbMediaKey(sqlite)).toBe(false);
  });

  it('leaves a current database alone', () => {
    sqlite.exec(tmdbMediaTable() + requestsTable());
    expect(migrateTmdbMediaKey(sqlite)).toBe(false);
  });
});
