import { describe, it, expect, vi, afterEach } from 'vitest';
import { bindPreferences, createPreferenceStore, DEFAULT_PREFERENCES, normalizeLanguageCode } from '../../../src/player/src/preferences.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: key => (key in data ? data[key] : null),
    setItem: vi.fn((key, value) => { data[key] = value; })
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createPreferenceStore', () => {
  it('startet mit Standardwerten und lädt Gespeichertes darüber', () => {
    expect(createPreferenceStore({}, { backend: memoryStorage() }).get()).toEqual(DEFAULT_PREFERENCES);
    const backend = memoryStorage({ 'vanta.player.prefs': JSON.stringify({ volume: 0.3, subtitleLanguage: 'de' }) });
    expect(createPreferenceStore({}, { backend }).get()).toMatchObject({ volume: 0.3, subtitleLanguage: 'de', muted: false });
  });

  it('schreibt Änderungen gebündelt und beim Abbau sofort', () => {
    vi.useFakeTimers();
    const backend = memoryStorage();
    const store = createPreferenceStore({ key: 'vanta.player.party.p1' }, { backend });
    store.update({ volume: 0.4 });
    store.update({ muted: true });
    expect(backend.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(backend.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(backend.data['vanta.player.party.p1'])).toMatchObject({ volume: 0.4, muted: true });

    store.update({ volume: 0.9 });
    store.flush();
    expect(JSON.parse(backend.data['vanta.player.party.p1']).volume).toBe(0.9);
  });

  it('übersteht kaputten oder blockierten Speicher', () => {
    const broken = { getItem: () => '{kaputt', setItem: () => { throw new Error('quota'); } };
    const store = createPreferenceStore({}, { backend: broken });
    expect(store.get()).toEqual(DEFAULT_PREFERENCES);
    store.update({ volume: 0.2 });
    expect(() => store.flush()).not.toThrow();
  });
});

describe('bindPreferences', () => {
  it('setzt die gespeicherte Lautstärke und merkt sich Änderungen', () => {
    vi.useFakeTimers();
    const local = memoryStorage({ 'vanta.player.prefs': JSON.stringify({ volume: 0.35, muted: true }) });
    vi.stubGlobal('localStorage', local);
    const player = new EventTarget();
    Object.assign(player, { volume: 0.8, muted: false });
    const disposers = [];
    const context = { player, disposers, listen: (target, event, handler) => target.addEventListener(event, handler) };
    bindPreferences(context);

    expect(player.volume).toBe(0.35);
    expect(player.muted).toBe(true);

    player.volume = 0.6;
    player.muted = false;
    player.dispatchEvent(new Event('volume-change'));
    disposers.forEach(dispose => dispose());
    expect(JSON.parse(local.data['vanta.player.prefs'])).toMatchObject({ volume: 0.6, muted: false });
  });

  it('nutzt in der Party den Sitzungsspeicher unter der Party-ID', () => {
    const player = new EventTarget();
    Object.assign(player, { volume: 0.8, muted: false });
    const context = { player, disposers: [], listen: () => {}, preferencesConfig: { key: 'vanta.player.party.abc', storage: 'session' } };
    vi.stubGlobal('sessionStorage', memoryStorage({ 'vanta.player.party.abc': JSON.stringify({ volume: 0.5 }) }));
    vi.stubGlobal('localStorage', memoryStorage({ 'vanta.player.prefs': JSON.stringify({ volume: 0.1 }) }));
    bindPreferences(context);
    // The solo volume (0.1) does not leak into the party.
    expect(player.volume).toBe(0.5);
  });

  it('übernimmt die Sprachen des Nutzers vom Server und meldet Änderungen zurück', () => {
    vi.stubGlobal('localStorage', memoryStorage({ 'vanta.player.prefs': JSON.stringify({ audioLanguage: 'jpn' }) }));
    const player = new EventTarget();
    Object.assign(player, { volume: 0.8, muted: false });
    const onUserPreferenceChange = vi.fn();
    const context = {
      player, disposers: [], listen: () => {},
      userPreferences: { audioLanguage: 'ger', subtitleLanguage: null },
      onUserPreferenceChange
    };
    bindPreferences(context);
    expect(context.preferences.get()).toMatchObject({ audioLanguage: 'ger', subtitleLanguage: null });

    context.preferences.update({ subtitleLanguage: 'eng' });
    expect(onUserPreferenceChange).toHaveBeenLastCalledWith({ subtitleLanguage: 'eng' });
    context.preferences.update({ volume: 0.2 });
    expect(onUserPreferenceChange).toHaveBeenCalledTimes(1);
  });

  it('lässt die lokale Wahl stehen, wenn der Server noch keine Sprache kennt (null)', () => {
    vi.stubGlobal('localStorage', memoryStorage({ 'vanta.player.prefs': JSON.stringify({ audioLanguage: 'jpn', subtitleLanguage: 'eng' }) }));
    const player = new EventTarget();
    Object.assign(player, { volume: 0.8, muted: false });
    const context = {
      player, disposers: [], listen: () => {},
      userPreferences: { audioLanguage: null, subtitleLanguage: null },
      onUserPreferenceChange: vi.fn()
    };
    bindPreferences(context);
    expect(context.preferences.get()).toMatchObject({ audioLanguage: 'jpn', subtitleLanguage: 'eng' });
    expect(context.onUserPreferenceChange).not.toHaveBeenCalled();
  });

  it('meldet regionale Codes als Sprache statt sie zu verwerfen', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const player = new EventTarget();
    Object.assign(player, { volume: 0.8, muted: false });
    const onUserPreferenceChange = vi.fn();
    const context = { player, disposers: [], listen: () => {}, userPreferences: {}, onUserPreferenceChange };
    bindPreferences(context);

    context.preferences.update({ subtitleLanguage: 'pt-BR' });
    expect(onUserPreferenceChange).toHaveBeenLastCalledWith({ subtitleLanguage: 'pt' });
    // This device keeps the exact track language.
    expect(context.preferences.get().subtitleLanguage).toBe('pt-BR');
    context.preferences.update({ subtitleLanguage: null });
    expect(onUserPreferenceChange).toHaveBeenLastCalledWith({ subtitleLanguage: null });
    context.preferences.update({ audioLanguage: 'Klingonisch!' });
    expect(onUserPreferenceChange).toHaveBeenCalledTimes(2);
  });
});

describe('normalizeLanguageCode', () => {
  it('kürzt Regionen weg und erkennt Unbrauchbares', () => {
    expect(normalizeLanguageCode('pt-BR')).toBe('pt');
    expect(normalizeLanguageCode('en_US')).toBe('en');
    expect(normalizeLanguageCode('GER')).toBe('ger');
    expect(normalizeLanguageCode(null)).toBeNull();
    expect(normalizeLanguageCode('')).toBeNull();
    expect(normalizeLanguageCode('deutsch')).toBeUndefined();
  });
});
