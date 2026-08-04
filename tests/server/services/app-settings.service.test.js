import { describe, it, expect, beforeEach } from 'vitest';
import { createAppSettingsService } from '../../../src/server/services/app-settings.service.js';

// Kleiner In-Memory-Ersatz für das echte sql.js-DB-Handle. Erkennt die drei Statements,
// die app-settings.service.js ausführt, und legt Werte in einer Map ab. Damit sind die
// Tests unabhängig von der echten requests.db isoliert.
function createFakeDb() {
  const store = new Map();

  return {
    store,
    prepare(sql) {
      if (sql.includes('SELECT value FROM app_settings')) {
        return { get: (key) => (store.has(key) ? { value: store.get(key).value } : undefined) };
      }

      if (sql.includes('INSERT OR REPLACE INTO app_settings')) {
        return { run: (key, value, updatedAt) => store.set(key, { value, updatedAt }) };
      }

      if (sql.includes('DELETE FROM app_settings')) {
        return { run: (key) => store.delete(key) };
      }

      throw new Error(`Unerwartetes SQL in Test-Fake: ${sql}`);
    }
  };
}

describe('AppSettingsService', () => {
  let db;
  let service;

  beforeEach(() => {
    db = createFakeDb();
    service = createAppSettingsService({ db });
  });

  it('returns null for a key that was never set', () => {
    expect(service.get('discord_webhook_url')).toBeNull();
  });

  it('sets a value and reads it back', () => {
    service.set('discord_webhook_url', 'https://discord.com/api/webhooks/1/abc');
    expect(service.get('discord_webhook_url')).toBe('https://discord.com/api/webhooks/1/abc');
  });

  it('stores updated_at as an ISO string on set', () => {
    service.set('discord_webhook_enabled', 'true');
    expect(db.store.get('discord_webhook_enabled').updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('upserts: setting the same key twice overwrites the previous value', () => {
    service.set('discord_webhook_enabled', 'true');
    service.set('discord_webhook_enabled', 'false');

    expect(service.get('discord_webhook_enabled')).toBe('false');
    expect(db.store.size).toBe(1);
  });

  it('removes a key', () => {
    service.set('discord_webhook_url', 'https://discord.com/api/webhooks/1/abc');
    service.remove('discord_webhook_url');

    expect(service.get('discord_webhook_url')).toBeNull();
  });

  it('remove is a no-op for a key that does not exist', () => {
    expect(() => service.remove('never_set')).not.toThrow();
    expect(service.get('never_set')).toBeNull();
  });

  it('keeps two independent service instances isolated when given separate DB handles', () => {
    const otherDb = createFakeDb();
    const otherService = createAppSettingsService({ db: otherDb });

    service.set('discord_webhook_url', 'https://discord.com/api/webhooks/1/abc');

    expect(otherService.get('discord_webhook_url')).toBeNull();
  });
});
