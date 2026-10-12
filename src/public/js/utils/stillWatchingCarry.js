const KEY = 'vanta.player.idleCarry';
// Only a switch that happens right now carries the count; a value left behind
// by a tab that was closed mid-switch is stale.
const MAX_AGE_MS = 60 * 1000;

// Hands the "Schaust du noch?" count from one player page to the next one
// (an episode switch replaces the page). Anything else starts from zero.
export function createIdleCarry({ storage = globalThis.sessionStorage, now = () => Date.now() } = {}) {
  return {
    give(idleMs) {
      try {
        storage?.setItem(KEY, JSON.stringify({ idleMs, at: now() }));
      } catch {
        // Without storage the next episode just starts counting anew.
      }
    },
    take() {
      try {
        const saved = JSON.parse(storage?.getItem(KEY) || 'null');
        storage?.removeItem(KEY);
        if (!saved || now() - saved.at > MAX_AGE_MS) return 0;
        return Math.max(0, Number(saved.idleMs) || 0);
      } catch {
        return 0;
      }
    }
  };
}
