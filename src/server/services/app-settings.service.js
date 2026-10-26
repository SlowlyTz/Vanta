// Key/value settings of the app (app_settings in requests.db). A factory, so
// tests can pass their own database.
import defaultDb from '../db/database.js';

const getSetting = (db) => db.prepare('SELECT value FROM app_settings WHERE key = ?');
const upsertSetting = (db) => db.prepare(`
  INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
`);
const deleteSetting = (db) => db.prepare('DELETE FROM app_settings WHERE key = ?');

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
