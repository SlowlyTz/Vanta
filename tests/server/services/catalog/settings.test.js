import { describe, it, expect } from 'vitest';
import {
  createCatalogSettings,
  parseUpdateInterval,
  parseFullSyncTime,
  CATALOG_DEFAULTS,
  SETTING_KEYS
} from '../../../../src/server/services/catalog/settings.js';

const memoryStore = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    get: key => values.get(key) ?? null,
    set: (key, value) => values.set(key, value),
    values
  };
};

describe('parseUpdateInterval', () => {
  it('accepts whole minutes between 1 and 60', () => {
    expect(parseUpdateInterval(5)).toEqual({ value: 5 });
    expect(parseUpdateInterval('60')).toEqual({ value: 60 });
  });

  it('rejects everything else with a German message', () => {
    for (const bad of [0, 61, 2.5, 'abc', '', null]) {
      expect(parseUpdateInterval(bad).error).toMatch(/zwischen 1 und 60/);
    }
  });
});

describe('parseFullSyncTime', () => {
  it('accepts HH:MM in 24h form', () => {
    expect(parseFullSyncTime('03:00')).toEqual({ value: '03:00' });
    expect(parseFullSyncTime(' 23:59 ')).toEqual({ value: '23:59' });
  });

  it('rejects malformed times', () => {
    for (const bad of ['24:00', '3:00', '03:60', '0300', '', null]) {
      expect(parseFullSyncTime(bad).error).toMatch(/HH:MM/);
    }
  });
});

describe('createCatalogSettings', () => {
  it('falls back to the defaults when nothing is stored', () => {
    const settings = createCatalogSettings({ store: memoryStore() });
    expect(settings.read()).toEqual(CATALOG_DEFAULTS);
  });

  it('falls back to the defaults when a stored value is invalid', () => {
    const settings = createCatalogSettings({ store: memoryStore({
      [SETTING_KEYS.updateIntervalMinutes]: '999',
      [SETTING_KEYS.fullSyncTime]: 'nachts'
    }) });
    expect(settings.read()).toEqual(CATALOG_DEFAULTS);
  });

  it('persists a valid update and reads it back', () => {
    const store = memoryStore();
    const settings = createCatalogSettings({ store });

    const result = settings.update({ updateIntervalMinutes: '15', fullSyncTime: '04:30' });

    expect(result).toEqual({ value: { updateIntervalMinutes: 15, fullSyncTime: '04:30' } });
    expect(store.get(SETTING_KEYS.updateIntervalMinutes)).toBe('15');
    expect(settings.read()).toEqual({ updateIntervalMinutes: 15, fullSyncTime: '04:30' });
  });

  it('updates one field and keeps the other', () => {
    const settings = createCatalogSettings({ store: memoryStore() });
    settings.update({ fullSyncTime: '05:00' });

    expect(settings.read()).toEqual({ updateIntervalMinutes: 10, fullSyncTime: '05:00' });
  });

  it('rejects an invalid update without writing anything', () => {
    const store = memoryStore();
    const settings = createCatalogSettings({ store });

    expect(settings.update({ updateIntervalMinutes: 0 }).error).toMatch(/zwischen/);
    expect(settings.update({ fullSyncTime: '25:00' }).error).toMatch(/HH:MM/);
    expect(store.values.size).toBe(0);
  });
});
