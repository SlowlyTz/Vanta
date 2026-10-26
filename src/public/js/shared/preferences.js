// Per-user settings that follow a user to every device; DOM-free, shared by the
// web app and the server.

// Stored server-side in requests.db (table user_preferences). Every key lists its
// default and the values it may take; anything else is dropped when it is saved.
export const PREFERENCE_SPEC = Object.freeze({
  // "Schaust du noch?" after this many hours of playback without input; 0 = off.
  stillWatchingHours: { default: 4, values: [0, 2, 3, 4, 6] },
  screensaverEnabled: { default: true, type: 'boolean' },
  // Screensaver on the home page after this many idle minutes.
  screensaverMinutes: { default: 10, values: [5, 10, 20, 30] },
  autoplayNextEpisode: { default: true, type: 'boolean' },
  autoSkipIntro: { default: false, type: 'boolean' },
  // The quality a stream starts with; 'auto' lets the server decide.
  defaultQuality: { default: 'auto', values: ['auto', '1080p', '720p', '480p', '360p'] },
  // Jellyfin language codes ("ger", "eng"); null = the file's default
  // track, and for subtitles: none.
  audioLanguage: { default: null, type: 'language' },
  subtitleLanguage: { default: null, type: 'language' },
  introAnimation: { default: 'auto', values: ['auto', 'off'] },
  reducedMotion: { default: false, type: 'boolean' }
});

export const DEFAULT_PREFERENCES = Object.freeze(
  Object.fromEntries(Object.entries(PREFERENCE_SPEC).map(([key, spec]) => [key, spec.default]))
);

const isValid = (spec, value) => {
  if (spec.type === 'boolean') return typeof value === 'boolean';
  if (spec.type === 'language') return value === null || (typeof value === 'string' && /^[a-z]{2,3}$/.test(value));
  return spec.values.includes(value);
};

// The valid, known part of `input` (unknown keys and bad values are dropped).
export function sanitizePreferences(input) {
  const clean = {};
  if (!input || typeof input !== 'object') return clean;
  for (const [key, spec] of Object.entries(PREFERENCE_SPEC)) {
    if (Object.hasOwn(input, key) && isValid(spec, input[key])) clean[key] = input[key];
  }
  return clean;
}

export const withDefaults = (stored) => ({ ...DEFAULT_PREFERENCES, ...sanitizePreferences(stored) });
