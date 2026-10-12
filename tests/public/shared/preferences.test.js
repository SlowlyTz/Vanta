import { describe, it, expect } from 'vitest';
import { DEFAULT_PREFERENCES, sanitizePreferences, withDefaults } from '../../../src/public/js/shared/preferences.js';

describe('shared preferences', () => {
  it('has a default for every key', () => {
    expect(DEFAULT_PREFERENCES).toMatchObject({ stillWatchingHours: 4, screensaverEnabled: true, screensaverMinutes: 10 });
  });

  it('keeps only known keys with allowed values', () => {
    expect(sanitizePreferences({ stillWatchingHours: 6, screensaverMinutes: 7, screensaverEnabled: 'yes', admin: true }))
      .toEqual({ stillWatchingHours: 6 });
    expect(sanitizePreferences(null)).toEqual({});
  });

  it('fills in defaults around stored values', () => {
    expect(withDefaults({ stillWatchingHours: 0 })).toEqual({ ...DEFAULT_PREFERENCES, stillWatchingHours: 0 });
  });
});
