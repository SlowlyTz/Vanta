// A real loading percentage: seconds of video buffered at the position
// against a target, plus the share of the HLS segment that is downloading
// right now (hls.js keeps its byte count live). The remaining time comes from
// how fast that number has been growing. Before the first byte arrives (the
// server is still transcoding) there is nothing to measure, and the phase
// says so instead of showing a made-up number.

export const LOAD_TARGET_SECONDS = 4;
// Smoothing of the loading speed; higher follows changes faster.
const RATE_SMOOTHING = 0.35;
// Speed is only trusted over at least this much time.
const MIN_RATE_WINDOW_MS = 600;
const END_EPSILON_SECONDS = 0.5;

// Seconds of the current fragment already downloaded, if it covers `position`.
export function partialFragmentSeconds(fragment, position) {
  const stats = fragment?.stats;
  const duration = Number(fragment?.duration);
  if (!stats || !(stats.total > 0) || !(duration > 0)) return 0;
  const end = Number(fragment.start) + duration;
  if (Number.isFinite(end) && end <= position) return 0;
  return duration * Math.min(1, Math.max(0, stats.loaded / stats.total));
}

export function measureLoad({ bufferedAhead = 0, fragment = null, position = 0, duration = NaN, target = LOAD_TARGET_SECONDS }) {
  const partial = partialFragmentSeconds(fragment, position);
  const loadedSeconds = Math.max(0, bufferedAhead) + partial;
  const nearEnd = Number.isFinite(duration) && duration > 0 && position + loadedSeconds >= duration - END_EPSILON_SECONDS;
  const fraction = nearEnd ? 1 : Math.min(1, loadedSeconds / target);
  const receiving = bufferedAhead > 0 || Number(fragment?.stats?.loaded) > 0;
  return { fraction, loadedSeconds, phase: fraction >= 1 ? 'done' : (receiving ? 'loading' : 'preparing') };
}

// Tracks the load for one position; `reset` when a new load or seek starts.
export function createLoadProgressTracker({ now = () => performance.now(), target = LOAD_TARGET_SECONDS } = {}) {
  let last = null;
  let rate = null;
  let startedAt = now();

  return {
    reset() {
      last = null;
      rate = null;
      startedAt = now();
    },
    update(input) {
      const measured = measureLoad({ target, ...input });
      const at = now();
      if (last && at > last.at) {
        const gained = measured.loadedSeconds - last.loadedSeconds;
        if (gained >= 0) {
          const sample = gained / ((at - last.at) / 1000);
          rate = rate === null ? sample : rate + RATE_SMOOTHING * (sample - rate);
        }
      }
      last = { at, loadedSeconds: measured.loadedSeconds };

      let etaSeconds = null;
      const missing = target - measured.loadedSeconds;
      if (measured.phase === 'loading' && rate > 0 && at - startedAt >= MIN_RATE_WINDOW_MS && missing > 0) {
        etaSeconds = Math.max(1, Math.ceil(missing / rate));
      }
      return { ...measured, etaSeconds };
    }
  };
}

export function formatLoadProgress({ fraction, etaSeconds, phase }) {
  if (phase === 'preparing') return 'Server bereitet Stream vor …';
  const percent = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)} %`;
  return etaSeconds ? `${percent} · noch ca. ${etaSeconds} s` : percent;
}
