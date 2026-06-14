export const PLAYBACK_MODES = Object.freeze({
  TRANSCODE: 'transcode',
  COMPATIBLE: 'compatible',
  DIRECT: 'direct'
});

export const DEFAULT_PLAYBACK_MODE = PLAYBACK_MODES.TRANSCODE;

export const PLAYBACK_MODE_OPTIONS = Object.freeze([
  {
    value: PLAYBACK_MODES.TRANSCODE,
    label: 'Immer transkodieren',
    shortLabel: 'Transcode'
  },
  {
    value: PLAYBACK_MODES.COMPATIBLE,
    label: 'Automatisch',
    shortLabel: 'Auto'
  },
  {
    value: PLAYBACK_MODES.DIRECT,
    label: 'Direktstream bevorzugen',
    shortLabel: 'Direkt'
  }
]);

const STORAGE_KEY = 'slowly-stream-settings';

const isValidPlaybackMode = (mode) => PLAYBACK_MODE_OPTIONS.some(option => option.value === mode);

class SettingsStore {
  constructor() {
    this.listeners = new Set();
    this.state = {
      playbackMode: DEFAULT_PLAYBACK_MODE
    };

    this.load();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState() {
    return { ...this.state };
  }

  getPlaybackMode() {
    return this.state.playbackMode;
  }

  setPlaybackMode(mode) {
    const playbackMode = isValidPlaybackMode(mode) ? mode : DEFAULT_PLAYBACK_MODE;
    if (this.state.playbackMode === playbackMode) return;

    this.state = {
      ...this.state,
      playbackMode
    };

    this.save();
    this.notify();
  }

  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const stored = JSON.parse(raw);
      if (isValidPlaybackMode(stored.playbackMode)) {
        this.state.playbackMode = stored.playbackMode;
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }

  save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }

  notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

export const settingsStore = new SettingsStore();
