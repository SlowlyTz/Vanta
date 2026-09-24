// The states a watch-party player reports about itself, and how they read.
// The server accepts exactly these; the own status line and the member list
// use the same words.

export const PLAYBACK_STATES = ['sync', 'correcting', 'buffering', 'paused', 'blocked'];

const LABELS = {
  sync: 'Synchron',
  correcting: 'Gleicht an …',
  buffering: 'Puffert …',
  paused: 'Pausiert',
  blocked: 'Wiedergabe blockiert'
};

export function playbackStateLabel(state, driftMs = null) {
  if (state === 'sync' && Number.isFinite(Number(driftMs)) && driftMs !== null) {
    return `Synchron · ±${Math.abs(Math.round(Number(driftMs)))} ms`;
  }
  return LABELS[state] || null;
}
