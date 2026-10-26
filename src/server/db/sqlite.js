// The statement API both sql.js databases offer (run/get/all, positional
// parameters or one array of them). `onWrite` runs after every run().
const normalizeParams = (params) => (params.length === 1 && Array.isArray(params[0]) ? params[0] : params);

export function createStatementFactory(sqlite, { onWrite = null, withRowId = false } = {}) {
  const lastInsertRowid = () => sqlite.exec('SELECT last_insert_rowid() AS id')[0]?.values?.[0]?.[0] || 0;

  return (sql) => ({
    run(...params) {
      sqlite.run(sql, normalizeParams(params));
      const result = { changes: sqlite.getRowsModified() };
      if (withRowId) result.lastInsertRowid = lastInsertRowid();
      onWrite?.();
      return result;
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
}
