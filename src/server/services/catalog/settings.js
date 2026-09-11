import { AppSettingsService } from '../app-settings.service.js';

export const SETTING_KEYS = {
  updateIntervalMinutes: 'catalog.updateIntervalMinutes',
  fullSyncTime: 'catalog.fullSyncTime'
};

export const CATALOG_DEFAULTS = {
  updateIntervalMinutes: 10,
  fullSyncTime: '03:00'
};

export const UPDATE_INTERVAL_MIN = 1;
export const UPDATE_INTERVAL_MAX = 60;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const parseUpdateInterval = (value) => {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < UPDATE_INTERVAL_MIN || minutes > UPDATE_INTERVAL_MAX) {
    return { error: `Das Intervall muss zwischen ${UPDATE_INTERVAL_MIN} und ${UPDATE_INTERVAL_MAX} Minuten liegen` };
  }
  return { value: minutes };
};

export const parseFullSyncTime = (value) => {
  const text = String(value ?? '').trim();
  if (!TIME_PATTERN.test(text)) {
    return { error: 'Die Uhrzeit muss im Format HH:MM angegeben werden' };
  }
  return { value: text };
};

// Settings live in the existing app_settings key/value table; unset or invalid
// stored values fall back to the defaults rather than breaking the scheduler.
export function createCatalogSettings({ store = AppSettingsService } = {}) {
  const read = () => {
    const interval = parseUpdateInterval(store.get(SETTING_KEYS.updateIntervalMinutes));
    const time = parseFullSyncTime(store.get(SETTING_KEYS.fullSyncTime));

    return {
      updateIntervalMinutes: interval.error ? CATALOG_DEFAULTS.updateIntervalMinutes : interval.value,
      fullSyncTime: time.error ? CATALOG_DEFAULTS.fullSyncTime : time.value
    };
  };

  const update = ({ updateIntervalMinutes, fullSyncTime } = {}) => {
    const next = read();

    if (updateIntervalMinutes !== undefined) {
      const parsed = parseUpdateInterval(updateIntervalMinutes);
      if (parsed.error) return { error: parsed.error };
      next.updateIntervalMinutes = parsed.value;
    }

    if (fullSyncTime !== undefined) {
      const parsed = parseFullSyncTime(fullSyncTime);
      if (parsed.error) return { error: parsed.error };
      next.fullSyncTime = parsed.value;
    }

    store.set(SETTING_KEYS.updateIntervalMinutes, String(next.updateIntervalMinutes));
    store.set(SETTING_KEYS.fullSyncTime, next.fullSyncTime);
    return { value: next };
  };

  return { read, update };
}
