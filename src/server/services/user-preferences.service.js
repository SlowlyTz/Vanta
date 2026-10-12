import db from '../db/database.js';
import { sanitizePreferences, withDefaults } from '../../public/js/shared/preferences.js';

const getRow = db.prepare('SELECT data FROM user_preferences WHERE user_id = ?');
const upsert = db.prepare(`
  INSERT INTO user_preferences (user_id, data, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
`);

const readStored = (userId) => {
  const row = getRow.get(userId);
  if (!row) return {};
  try {
    return sanitizePreferences(JSON.parse(row.data));
  } catch {
    return {};
  }
};

// A user's settings, always complete (defaults for what was never set).
export class UserPreferencesService {
  static get(userId) {
    return withDefaults(readStored(userId));
  }

  // Merges the valid part of `patch` into what is stored. Only what a user
  // set is stored, so a later default change still reaches users who never
  // touched a setting.
  static update(userId, patch) {
    const clean = sanitizePreferences(patch);
    const next = { ...readStored(userId), ...clean };
    upsert.run(userId, JSON.stringify(next), Date.now());
    return withDefaults(next);
  }
}
