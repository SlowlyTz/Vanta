import defaultDb from '../db/database.js';

const getSetting = (db) => db.prepare('SELECT value FROM app_settings WHERE key = ?');
const upsertSetting = (db) => db.prepare(`
  INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
`);
const deleteSetting = (db) => db.prepare('DELETE FROM app_settings WHERE key = ?');

// Schmaler Wrapper um die bereits bestehende app_settings-Tabelle (key/value/updated_at).
// Kein Schema-Change, keine Migration. Als Factory mit injizierbarem DB-Handle exportiert,
// damit Tests ihn isoliert gegen ein eigenes DB-Handle laufen lassen können.
export function createAppSettingsService({ db = defaultDb } = {}) {
  const getStatement = getSetting(db);
  const upsertStatement = upsertSetting(db);
  const deleteStatement = deleteSetting(db);

  return {
    get(key) {
      const row = getStatement.get(key);
      return row ? row.value : null;
    },

    set(key, value) {
      upsertStatement.run(key, value, new Date().toISOString());
    },

    remove(key) {
      deleteStatement.run(key);
    }
  };
}

export const AppSettingsService = createAppSettingsService();
