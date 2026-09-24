// Keeps the local player on the server timeline. Runs continuously instead of
// only when a heartbeat arrives: small drift is closed by nudging the playback
// rate (inaudible within a few percent), large drift by one seek that aims a
// little ahead to cover the time the seek itself takes.

export const DRIFT_TICK_MS = 500;
export const DRIFT_DEADBAND_MS = 120;
export const DRIFT_SETTLED_MS = 50;
export const DRIFT_HARD_SEEK_MS = 2_000;
export const PAUSED_TOLERANCE_MS = 250;
export const SETTLE_AFTER_SEEK_MS = 1_500;
export const MIN_RATE_OFFSET = 0.02;
export const MAX_RATE_OFFSET = 0.06;
export const DEFAULT_SEEK_LATENCY_MS = 150;
const MAX_SEEK_LATENCY_MS = 1_500;

export function timelinePositionAt(timeline, now) {
  const positionMs = Number(timeline?.positionMs) || 0;
  if (!timeline?.playing) return positionMs;
  return positionMs + Math.max(0, now - (Number(timeline.anchorServerTimeMs) || now));
}

// Maps drift (ms, positive = ahead) to a playback rate: 1 ± drift/4 in
// seconds, never less than 2 % and never more than 6 %.
export function rateForDrift(driftMs) {
  const offset = Math.min(MAX_RATE_OFFSET, Math.max(MIN_RATE_OFFSET, Math.abs(driftMs) / 4_000));
  return driftMs > 0 ? 1 - offset : 1 + offset;
}

// Pure decision for one tick. `correcting` carries the hysteresis: once the
// rate is nudged it stays nudged until the drift is below DRIFT_SETTLED_MS.
export function computeDriftAction({
  timeline,
  state,
  now,
  correcting = false,
  lastHardSeekAt = -Infinity,
  seekLatencyMs = DEFAULT_SEEK_LATENCY_MS
}) {
  if (!timeline || !state?.ready) return { type: 'idle', status: 'preparing' };
  if (state.busy) return { type: 'wait', status: 'buffering' };

  const expectedMs = timelinePositionAt(timeline, now);
  const driftMs = state.currentTime * 1000 - expectedMs;
  // A countdown timeline runs from its anchor in the future; until then the
  // player waits on the first frame like a paused one.
  const beforeStart = timeline.playing && now < Number(timeline.anchorServerTimeMs);

  if (!timeline.playing || beforeStart) {
    return {
      type: 'paused',
      status: beforeStart ? 'countdown' : 'paused',
      driftMs,
      pause: !state.paused,
      seekToMs: Math.abs(driftMs) > PAUSED_TOLERANCE_MS ? expectedMs : null,
      rate: 1
    };
  }

  if (state.paused) {
    if (state.autoplayBlocked) return { type: 'blocked', status: 'blocked', driftMs };
    return {
      type: 'play',
      status: 'correcting',
      driftMs,
      seekToMs: Math.abs(driftMs) > DRIFT_HARD_SEEK_MS ? expectedMs + seekLatencyMs : null,
      rate: 1
    };
  }

  if (now - lastHardSeekAt < SETTLE_AFTER_SEEK_MS) return { type: 'settle', status: 'correcting', driftMs };

  const absDrift = Math.abs(driftMs);
  if (absDrift > DRIFT_HARD_SEEK_MS) {
    return { type: 'seek', status: 'correcting', driftMs, seekToMs: expectedMs + seekLatencyMs, rate: 1 };
  }
  if (absDrift > DRIFT_DEADBAND_MS || (correcting && absDrift > DRIFT_SETTLED_MS)) {
    return { type: 'rate', status: 'correcting', driftMs, rate: rateForDrift(driftMs) };
  }
  return { type: 'hold', status: 'sync', driftMs, rate: 1 };
}

export function createDriftController({
  getController,
  getTimeline,
  now,
  onStatus = () => {},
  onHardSeek = () => {},
  onAutoplayBlocked = () => {},
  setTimer = (fn, ms) => window.setInterval(fn, ms),
  clearTimer = id => window.clearInterval(id)
}) {
  let timer = null;
  let correcting = false;
  let lastHardSeekAt = -Infinity;
  let seekLatencyMs = DEFAULT_SEEK_LATENCY_MS;
  let measureAfterSeek = false;
  let playInFlight = false;
  let lastStatus = null;

  const report = (action, extra = {}) => {
    lastStatus = { status: action.status, driftMs: action.driftMs ?? null, seekLatencyMs, ...extra };
    onStatus(lastStatus);
  };

  const tick = () => {
    const controller = getController();
    const timeline = getTimeline();
    const state = controller?.getSyncState?.();
    const current = now();
    const action = computeDriftAction({ timeline, state, now: current, correcting, lastHardSeekAt, seekLatencyMs });

    // The first calm tick after a hard seek shows how far behind the seek
    // left us; that becomes the lead for the next one.
    if (measureAfterSeek && action.type !== 'wait' && action.type !== 'idle' && action.type !== 'settle' && Number.isFinite(action.driftMs)) {
      measureAfterSeek = false;
      const behindMs = -action.driftMs + seekLatencyMs;
      if (behindMs > 0) seekLatencyMs = Math.min(MAX_SEEK_LATENCY_MS, Math.round(seekLatencyMs * 0.5 + behindMs * 0.5));
    }

    switch (action.type) {
      case 'paused':
        correcting = false;
        controller.setSyncRate(1);
        if (action.pause) controller.syncPause();
        if (action.seekToMs !== null) controller.syncSeek(action.seekToMs / 1000);
        break;
      case 'play':
        correcting = false;
        controller.setSyncRate(1);
        if (action.seekToMs !== null) {
          controller.syncSeek(action.seekToMs / 1000);
          lastHardSeekAt = current;
        }
        if (!playInFlight) {
          playInFlight = true;
          Promise.resolve(controller.syncPlay())
            .catch(error => {
              if (error?.name === 'NotAllowedError') onAutoplayBlocked(error);
            })
            .finally(() => { playInFlight = false; });
        }
        break;
      case 'seek':
        correcting = false;
        controller.setSyncRate(1);
        controller.syncSeek(action.seekToMs / 1000);
        lastHardSeekAt = current;
        measureAfterSeek = true;
        onHardSeek(action);
        break;
      case 'rate':
        correcting = true;
        controller.setSyncRate(action.rate);
        break;
      case 'hold':
        correcting = false;
        controller.setSyncRate(1);
        break;
      default:
        break;
    }

    report(action, { rate: controller?.getSyncState?.()?.rate ?? 1 });
    return action;
  };

  return {
    tick,
    start() {
      if (timer !== null) return;
      timer = setTimer(tick, DRIFT_TICK_MS);
    },
    stop() {
      if (timer === null) return;
      clearTimer(timer);
      timer = null;
      correcting = false;
    },
    // A forced resync: jump straight onto the timeline on the next tick.
    resync() {
      lastHardSeekAt = -Infinity;
      const controller = getController();
      const timeline = getTimeline();
      if (!controller || !timeline) return;
      controller.setSyncRate(1);
      controller.syncSeek((timelinePositionAt(timeline, now()) + (timeline.playing ? seekLatencyMs : 0)) / 1000);
      lastHardSeekAt = now();
      measureAfterSeek = Boolean(timeline.playing);
    },
    get running() { return timer !== null; },
    get status() { return lastStatus; }
  };
}
