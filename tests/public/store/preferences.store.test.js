import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/public/js/api/preferences.api.js', () => ({
  PreferencesApi: { get: vi.fn(), update: vi.fn() }
}));

import { PreferencesApi } from '../../../src/public/js/api/preferences.api.js';
import { preferencesStore } from '../../../src/public/js/store/preferences.store.js';
import { DEFAULT_PREFERENCES } from '../../../src/public/js/shared/preferences.js';

describe('preferencesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preferencesStore.clear();
  });

  it('starts from the defaults and loads the user\'s settings', async () => {
    expect(preferencesStore.getState()).toEqual(DEFAULT_PREFERENCES);
    PreferencesApi.get.mockResolvedValue({ stillWatchingHours: 6 });

    await preferencesStore.load();

    expect(preferencesStore.get('stillWatchingHours')).toBe(6);
    expect(JSON.parse(localStorage.getItem('vanta.preferences')).stillWatchingHours).toBe(6);
  });

  it('applies a change at once and keeps the server\'s answer', async () => {
    const seen = [];
    const unsubscribe = preferencesStore.subscribe(state => seen.push(state.screensaverMinutes));
    PreferencesApi.update.mockResolvedValue({ ...DEFAULT_PREFERENCES, screensaverMinutes: 20 });

    await preferencesStore.update({ screensaverMinutes: 20, bogus: 1 });

    expect(PreferencesApi.update).toHaveBeenCalledWith({ screensaverMinutes: 20 });
    expect(seen).toEqual([10, 20, 20]);
    unsubscribe();
  });

  it('puts the old value back when the save fails', async () => {
    PreferencesApi.update.mockRejectedValue(new Error('offline'));

    await expect(preferencesStore.update({ screensaverEnabled: false })).rejects.toThrow('offline');

    expect(preferencesStore.get('screensaverEnabled')).toBe(true);
  });

  it('rolls back only the keys of the failed save, and not after a newer save of them', async () => {
    let failA;
    PreferencesApi.update.mockReturnValueOnce(new Promise((_, reject) => { failA = reject; }));
    const a = preferencesStore.update({ screensaverMinutes: 20, stillWatchingHours: 6 });
    PreferencesApi.update.mockResolvedValueOnce({ ...DEFAULT_PREFERENCES, screensaverMinutes: 30, screensaverEnabled: false });
    await preferencesStore.update({ screensaverMinutes: 30, screensaverEnabled: false });
    // The answer of B does not undo A, which is still on its way.
    expect(preferencesStore.get('stillWatchingHours')).toBe(6);

    failA(new Error('offline'));
    await expect(a).rejects.toThrow('offline');
    expect(preferencesStore.get('screensaverMinutes')).toBe(30);
    expect(preferencesStore.get('screensaverEnabled')).toBe(false);
    expect(preferencesStore.get('stillWatchingHours')).toBe(DEFAULT_PREFERENCES.stillWatchingHours);
  });

  it('keeps a newer pending change when an older save answers', async () => {
    let answerA;
    PreferencesApi.update.mockReturnValueOnce(new Promise(resolve => { answerA = resolve; }));
    const a = preferencesStore.update({ screensaverMinutes: 20 });
    PreferencesApi.update.mockReturnValueOnce(new Promise(() => {}));
    preferencesStore.update({ screensaverMinutes: 30 });
    answerA({ ...DEFAULT_PREFERENCES, screensaverMinutes: 20 });
    await a;
    expect(preferencesStore.get('screensaverMinutes')).toBe(30);
  });

  it('drops the reduce-motion class on logout', () => {
    preferencesStore.apply({ reducedMotion: true });
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
    preferencesStore.clear();
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);
  });

  it('forgets everything on logout', () => {
    preferencesStore.apply({ stillWatchingHours: 2 });
    preferencesStore.clear();
    expect(preferencesStore.get('stillWatchingHours')).toBe(4);
    expect(localStorage.getItem('vanta.preferences')).toBeNull();
  });

  it('drops an answer that arrives after logout', async () => {
    let answer;
    PreferencesApi.get.mockReturnValue(new Promise(resolve => { answer = resolve; }));
    const loading = preferencesStore.load();
    preferencesStore.clear();
    answer({ stillWatchingHours: 6 });
    await loading;

    expect(preferencesStore.getState()).toEqual(DEFAULT_PREFERENCES);
    expect(localStorage.getItem('vanta.preferences')).toBeNull();
  });
});
