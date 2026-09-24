// What the player remembers between videos: volume, mute, the subtitle and
// audio language and how subtitles look. Watching alone it is kept for good
// (localStorage); in a watch party it starts from the defaults and lasts for
// that party's session (sessionStorage under the party id).

export const SOLO_PREFERENCES_KEY = 'vanta.player.prefs';
export const partyPreferencesKey = partyId => `vanta.player.party.${partyId}`;

export const DEFAULT_PREFERENCES = Object.freeze({
  volume: 0.8,
  muted: false,
  subtitleLanguage: null,
  audioLanguage: null,
  subtitleSize: 'medium',
  subtitleBackground: 'semi'
});

const SAVE_DELAY_MS = 400;

function resolveStorage(kind) {
  try {
    return kind === 'session' ? globalThis.sessionStorage : globalThis.localStorage;
  } catch {
    return null;
  }
}

export function createPreferenceStore({ key = SOLO_PREFERENCES_KEY, storage = 'local' } = {}, { backend = resolveStorage(storage) } = {}) {
  let values = { ...DEFAULT_PREFERENCES };
  try {
    const saved = JSON.parse(backend?.getItem(key) || 'null');
    if (saved && typeof saved === 'object') values = { ...values, ...saved };
  } catch {
    // Unreadable or blocked storage: start from the defaults.
  }
  let timer = null;

  const write = () => {
    timer = null;
    try {
      backend?.setItem(key, JSON.stringify(values));
    } catch {
      // Private mode or full storage: the preference just is not kept.
    }
  };

  return {
    get: () => ({ ...values }),
    update(patch) {
      values = { ...values, ...patch };
      if (timer === null) timer = setTimeout(write, SAVE_DELAY_MS);
    },
    flush() {
      if (timer !== null) {
        clearTimeout(timer);
        write();
      }
    }
  };
}

// Applies the stored volume and keeps it up to date as the viewer changes it.
export function bindPreferences(context) {
  const { player, listen } = context;
  const store = createPreferenceStore(context.preferencesConfig || undefined);
  context.preferences = store;

  const { volume, muted } = store.get();
  if (Number.isFinite(volume)) player.volume = Math.min(1, Math.max(0, volume));
  player.muted = Boolean(muted);

  listen(player, 'volume-change', () => {
    store.update({ volume: Number(player.volume), muted: Boolean(player.muted) });
  });
  context.disposers.push(() => store.flush());
  return context;
}
