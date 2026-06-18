import db from '../db/database.js';

const FORCE_HLS_TRANSCODING_KEY = 'force_hls_transcoding';

const nowIso = () => new Date().toISOString();

const parseBoolean = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return defaultValue;
};

export class SettingsService {
  static getSetting(key, defaultValue = null) {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  }

  static setSetting(key, value) {
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run(key, String(value), nowIso());
  }

  static getBooleanSetting(key, defaultValue = false) {
    const raw = this.getSetting(key);
    return parseBoolean(raw, defaultValue);
  }

  static setBooleanSetting(key, value) {
    this.setSetting(key, value === true ? 'true' : 'false');
  }

  static getTranscodingSettings() {
    return {
      forceHlsTranscoding: this.getBooleanSetting(FORCE_HLS_TRANSCODING_KEY, true)
    };
  }

  static updateTranscodingSettings({ forceHlsTranscoding }) {
    if (typeof forceHlsTranscoding !== 'boolean') {
      throw new Error('forceHlsTranscoding must be a boolean');
    }

    this.setBooleanSetting(FORCE_HLS_TRANSCODING_KEY, forceHlsTranscoding);
    return this.getTranscodingSettings();
  }
}
