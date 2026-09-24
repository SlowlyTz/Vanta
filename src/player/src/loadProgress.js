// A real loading percentage, in three stages:
// - loading: seconds of video buffered at the position against a target, plus
//   the share of the HLS segment downloading right now (hls.js keeps its byte
//   count live); the time left comes from how fast that number grows.
// - transcoding: no bytes yet, but Jellyfin reports how far its transcoder
//   got; the percentage is the progress through the segment the position
//   needs, the time left follows from the encoding speed.
// - preparing: Jellyfin reports nothing yet (the source is still being
//   opened). Only an estimate is possible, from how long the first bytes took
//   before; it is marked as such ("ca.").

export const LOAD_TARGET_SECONDS = 4;
export const DEFAULT_SEGMENT_SECONDS = 6;
// The estimate never claims to be done.
const ESTIMATE_CAP = 0.95;
// Smoothing of the loading speed; higher follows changes faster.
const RATE_SMOOTHING = 0.35;
// Speed is only trusted over at least this much time.
const MIN_RATE_WINDOW_MS = 600;
const END_EPSILON_SECONDS = 0.5;

const clamp01 = value => Math.min(1, Math.max(0, value));

// Seconds of the current fragment already downloaded, if it covers `position`.
export function partialFragmentSeconds(fragment, position) {
  const stats = fragment?.stats;
  const duration = Number(fragment?.duration);
  if (!stats || !(stats.total > 0) || !(duration > 0)) return 0;
  const end = Number(fragment.start) + duration;
  if (Number.isFinite(end) && end <= position) return 0;
  return duration * clamp01(stats.loaded / stats.total);
}

// Jellyfin's position can be absolute or counted from where the transcode
// started (the start of the segment holding `position`).
export function transcodedPosition(transcodedSeconds, position, segmentSeconds = DEFAULT_SEGMENT_SECONDS) {
  const segmentStart = Math.floor(position / segmentSeconds) * segmentSeconds;
  if (!Number.isFinite(transcodedSeconds)) return null;
  return transcodedSeconds >= segmentStart - 1 ? transcodedSeconds : segmentStart + transcodedSeconds;
}

export function measureLoad({
  bufferedAhead = 0,
  fragment = null,
  position = 0,
  duration = NaN,
  target = LOAD_TARGET_SECONDS,
  transcode = null,
  segmentSeconds = DEFAULT_SEGMENT_SECONDS,
  elapsedMs = 0,
  expectedMs = null
}) {
  const partial = partialFragmentSeconds(fragment, position);
  const loadedSeconds = Math.max(0, bufferedAhead) + partial;
  const nearEnd = Number.isFinite(duration) && duration > 0 && position + loadedSeconds >= duration - END_EPSILON_SECONDS;
  const receiving = bufferedAhead > 0 || Number(fragment?.stats?.loaded) > 0;

  if (nearEnd || loadedSeconds >= target) return { fraction: 1, loadedSeconds, phase: 'done', etaSeconds: null, approx: false };
  if (receiving) return { fraction: clamp01(loadedSeconds / target), loadedSeconds, phase: 'loading', etaSeconds: null, approx: false };

  const reached = transcodedPosition(Number(transcode?.positionSeconds), position, segmentSeconds);
  if (reached !== null) {
    const segmentStart = Math.floor(position / segmentSeconds) * segmentSeconds;
    const needed = segmentStart + segmentSeconds;
    const speed = Number(transcode.speed);
    return {
      fraction: clamp01((reached - segmentStart) / segmentSeconds),
      loadedSeconds: 0,
      phase: 'transcoding',
      etaSeconds: speed > 0 ? Math.max(1, Math.ceil((needed - reached) / speed)) : null,
      approx: false
    };
  }

  if (expectedMs > 0) {
    const overdue = elapsedMs >= expectedMs;
    return {
      fraction: Math.min(ESTIMATE_CAP, elapsedMs / expectedMs),
      loadedSeconds: 0,
      phase: 'preparing',
      etaSeconds: overdue ? null : Math.max(1, Math.ceil((expectedMs - elapsedMs) / 1000)),
      approx: true,
      overdue
    };
  }
  return { fraction: 0, loadedSeconds: 0, phase: 'preparing', etaSeconds: null, approx: true };
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
    elapsedMs: () => now() - startedAt,
    update(input) {
      const at = now();
      const measured = measureLoad({ target, elapsedMs: at - startedAt, ...input });
      if (measured.phase !== 'loading') {
        last = null;
        rate = null;
        return measured;
      }
      if (last && at > last.at) {
        const gained = measured.loadedSeconds - last.loadedSeconds;
        if (gained >= 0) {
          const sample = gained / ((at - last.at) / 1000);
          rate = rate === null ? sample : rate + RATE_SMOOTHING * (sample - rate);
        }
      }
      if (!last) last = { at, loadedSeconds: measured.loadedSeconds, since: at };
      else last = { ...last, at, loadedSeconds: measured.loadedSeconds };

      const missing = target - measured.loadedSeconds;
      const etaSeconds = rate > 0 && at - last.since >= MIN_RATE_WINDOW_MS && missing > 0
        ? Math.max(1, Math.ceil(missing / rate))
        : null;
      return { ...measured, etaSeconds };
    }
  };
}

export function formatLoadProgress({ fraction, etaSeconds, phase, approx, overdue }) {
  const percent = `${Math.round(clamp01(fraction) * 100)} %`;
  const eta = etaSeconds ? ` · noch ca. ${etaSeconds} s` : '';
  if (phase === 'transcoding') return `Jellyfin transkodiert … ${percent}${eta}`;
  if (phase === 'preparing') {
    if (overdue) return 'Server bereitet Stream vor … dauert länger als üblich';
    if (!approx || fraction <= 0) return 'Server bereitet Stream vor …';
    return `Server bereitet Stream vor … ca. ${percent}${eta}`;
  }
  return `${percent}${eta}`;
}

// How long the first bytes usually take in this browser, for the estimate.
const FIRST_BYTE_KEY = 'vanta.player.firstByteMs';
export const DEFAULT_FIRST_BYTE_MS = 8_000;
const HISTORY_SMOOTHING = 0.3;

export function createFirstByteHistory(storage = () => window.localStorage) {
  const read = () => {
    try {
      const value = Number(storage()?.getItem(FIRST_BYTE_KEY));
      return value > 0 ? value : null;
    } catch {
      return null;
    }
  };
  return {
    expectedMs: () => read() ?? DEFAULT_FIRST_BYTE_MS,
    record(ms) {
      if (!(ms >= 200) || ms > 300_000) return;
      const previous = read();
      const next = previous === null ? ms : previous + HISTORY_SMOOTHING * (ms - previous);
      try {
        storage()?.setItem(FIRST_BYTE_KEY, String(Math.round(next)));
      } catch {
        // Private mode or blocked storage: the estimate keeps its default.
      }
    }
  };
}
