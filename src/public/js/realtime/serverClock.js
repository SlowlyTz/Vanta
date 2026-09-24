// Estimates the offset between this browser's clock and the server clock over
// the watch-party socket (TIME_PING / TIME_PONG), so countdowns and playback
// positions line up even when a device clock is off by seconds. The sample
// with the smallest round trip wins: its one-way delay is the best known.

const BURST_SIZE = 6;
const BURST_GAP_MS = 150;
const REFRESH_INTERVAL_MS = 30_000;
const REFRESH_BURST_SIZE = 3;
const SAMPLE_WINDOW = 12;
const JUMP_THRESHOLD_MS = 1_000;
const SMOOTHING = 0.5;

function defaultLocalNow() {
  if (typeof performance !== 'undefined' && Number.isFinite(performance.timeOrigin)) {
    return performance.timeOrigin + performance.now();
  }
  return Date.now();
}

// Development aid: `?wpSkew=3000` pretends this device's clock runs three
// seconds ahead, to reproduce a skewed phone with two tabs on one machine.
export function readSkewFromLocation(location = globalThis.location) {
  try {
    const value = Number(new URLSearchParams(location?.search || '').get('wpSkew'));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function pickBestSample(samples) {
  let best = null;
  for (const sample of samples) {
    if (!best || sample.rtt < best.rtt) best = sample;
  }
  return best;
}

export function createServerClock({
  send,
  localNow = defaultLocalNow,
  skewMs = 0,
  setTimer = (fn, ms) => window.setTimeout(fn, ms),
  clearTimer = id => window.clearTimeout(id)
} = {}) {
  const readLocal = () => localNow() + skewMs;
  const samples = [];
  const timers = new Set();
  let offset = 0;
  let rtt = null;
  let synced = false;
  let stopped = false;
  let refreshTimer = null;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });

  const schedule = (fn, ms) => {
    const id = setTimer(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };

  const ping = () => {
    if (stopped) return;
    send?.({ type: 'TIME_PING', clientSentAt: readLocal() });
  };

  const burst = (size = BURST_SIZE) => {
    for (let i = 0; i < size; i++) schedule(ping, i * BURST_GAP_MS);
  };

  const scheduleRefresh = () => {
    if (stopped) return;
    refreshTimer = schedule(() => {
      burst(REFRESH_BURST_SIZE);
      scheduleRefresh();
    }, REFRESH_INTERVAL_MS);
  };

  const handlePong = ({ clientSentAt, serverTimeMs } = {}) => {
    const sentAt = Number(clientSentAt);
    const serverTime = Number(serverTimeMs);
    if (!Number.isFinite(sentAt) || !Number.isFinite(serverTime)) return;

    const receivedAt = readLocal();
    const roundTrip = receivedAt - sentAt;
    if (roundTrip < 0 || roundTrip > 10_000) return;

    samples.push({ rtt: roundTrip, offset: serverTime + roundTrip / 2 - receivedAt });
    if (samples.length > SAMPLE_WINDOW) samples.shift();

    const best = pickBestSample(samples);
    // A tighter round trip is strictly better information and replaces the
    // estimate; otherwise (the best sample aged out of the window) glide.
    const moreAccurate = rtt === null || best.rtt < rtt;
    rtt = best.rtt;
    if (!synced || moreAccurate || Math.abs(best.offset - offset) > JUMP_THRESHOLD_MS) {
      offset = best.offset;
    } else {
      offset += (best.offset - offset) * SMOOTHING;
    }

    if (!synced) {
      synced = true;
      resolveReady();
    }
  };

  return {
    ready,
    now: () => readLocal() + offset,
    // Starts a measuring burst; call again after every (re)connect.
    start: () => {
      if (stopped) return;
      burst();
      if (refreshTimer === null) scheduleRefresh();
    },
    handlePong,
    get offset() { return offset; },
    get rtt() { return rtt; },
    get synced() { return synced; },
    stop: () => {
      stopped = true;
      timers.forEach(id => clearTimer(id));
      timers.clear();
      refreshTimer = null;
    }
  };
}
