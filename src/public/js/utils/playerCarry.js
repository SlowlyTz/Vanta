// Hands viewing-session state from one player page to the next (an episode
// switch replaces the page): the "Schaust du noch?" count, the sleep timer and
// where playback was started from. Anything else starts anew.
const KEY = 'vanta.player.carry';
// Only a switch that happens right now carries anything; a value left behind
// by a tab that was closed mid-switch is stale.
const MAX_AGE_MS = 60 * 1000;

export function createPlayerCarry({ storage = globalThis.sessionStorage, now = () => Date.now() } = {}) {
  return {
    give(state) {
      try {
        storage?.setItem(KEY, JSON.stringify({ ...state, at: now() }));
      } catch {
        // Without storage the next episode just starts anew.
      }
    },
    take() {
      try {
        const saved = JSON.parse(storage?.getItem(KEY) || 'null');
        storage?.removeItem(KEY);
        if (!saved || now() - saved.at > MAX_AGE_MS) return {};
        const { at, ...state } = saved;
        return state;
      } catch {
        return {};
      }
    }
  };
}

// The sleep timer the next episode takes along. "Bis zum Ende" belongs to the
// episode it was set on: it already kept that one from moving on, so an
// episode the viewer picks themselves starts without it. A set time runs on.
export function sleepForNextEpisode(sleep, { manual = false } = {}) {
  if (!sleep || (manual && sleep.mode === 'end')) return null;
  return sleep;
}
