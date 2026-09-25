import initSqlJs from 'sql.js';

// An in-memory stand-in for src/server/db/database.js with the tables the
// report and notification services use, and the same prepare() surface.
export async function createMemoryDb() {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  sqlite.exec(`
    CREATE TABLE requests (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT NOT NULL, user_id TEXT, updated_at INTEGER NOT NULL);
    CREATE TABLE reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT, item_id TEXT NOT NULL, item_type TEXT NOT NULL, title TEXT NOT NULL,
      production_year INTEGER, report_scope TEXT NOT NULL DEFAULT 'all', season_number INTEGER, episode_number INTEGER,
      episode_name TEXT, problem TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open',
      user_id TEXT, username TEXT, handled_by TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE notification_seen (user_id TEXT NOT NULL, kind TEXT NOT NULL, seen_at INTEGER NOT NULL, PRIMARY KEY (user_id, kind));
  `);
  const all = (sql, params) => {
    const statement = sqlite.prepare(sql);
    try {
      if (params.length) statement.bind(params);
      const rows = [];
      while (statement.step()) rows.push(statement.getAsObject());
      return rows;
    } finally {
      statement.free();
    }
  };
  return {
    sqlite,
    prepare: sql => ({
      run: (...params) => {
        sqlite.run(sql, params);
        const id = sqlite.exec('SELECT last_insert_rowid()')[0].values[0][0];
        return { changes: sqlite.getRowsModified(), lastInsertRowid: id };
      },
      get: (...params) => all(sql, params)[0],
      all: (...params) => all(sql, params)
    }),
    exec: sql => sqlite.exec(sql)
  };
}
