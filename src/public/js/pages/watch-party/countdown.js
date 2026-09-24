import { countdownMetaParts, formatPosition } from './helpers.js';

// Close to the start a timer is too coarse; the last few milliseconds are
// waited out frame by frame against the server clock.
const FRAME_PRECISION_WINDOW_MS = 40;

export function countdownDigit(remainingMs, durationMs = 5000) {
  const maxDigit = Math.round(durationMs / 1000);
  return Math.min(maxDigit, Math.max(0, Math.ceil(remainingMs / 1000)));
}

export function bindCountdown(ctx) {
  const nextFrame = callback => (window.requestAnimationFrame
    ? window.requestAnimationFrame(callback)
    : window.setTimeout(callback, 4));

  ctx.showCountdown = ({ startsAtServerTimeMs, durationMs = 5000, positionMs }) => {
    ctx.hideReadyOverlay();
    ctx.countdownOverlay.hidden = false;
    if (ctx.countdownTimer) window.clearInterval(ctx.countdownTimer);

    const snapshot = ctx.party?.itemSnapshot || {};
    const metaParts = countdownMetaParts(snapshot);
    ctx.countdownTitle.textContent = snapshot.name || 'Unbekanntes Medium';
    ctx.countdownMeta.textContent = metaParts.join(' · ');
    ctx.countdownMeta.hidden = metaParts.length === 0;
    ctx.countdownPosition.textContent = formatPosition(positionMs);

    const tick = () => {
      const remaining = countdownDigit(startsAtServerTimeMs - ctx.clock.now(), durationMs);
      ctx.countdownNumber.textContent = String(remaining);
      if (remaining <= 0) {
        window.clearInterval(ctx.countdownTimer);
        ctx.countdownTimer = null;
      }
    };

    tick();
    ctx.countdownTimer = window.setInterval(tick, 100);
  };

  ctx.hideCountdown = () => {
    ctx.countdownOverlay.hidden = true;
    if (ctx.countdownTimer) {
      window.clearInterval(ctx.countdownTimer);
      ctx.countdownTimer = null;
    }
  };

  // Every client starts on its own at the announced server time instead of
  // waiting for a message; the video is buffered, so it starts within a frame.
  ctx.scheduleSyncedStart = startsAtServerTimeMs => {
    const startsAt = Number(startsAtServerTimeMs);
    if (!Number.isFinite(startsAt) || ctx.scheduledStartAt === startsAt || ctx.localPlaybackStarted) return;
    ctx.cancelSyncedStart();
    ctx.scheduledStartAt = startsAt;

    const fire = () => {
      if (ctx.destroyed || ctx.scheduledStartAt !== startsAt) return;
      const remaining = startsAt - ctx.clock.now();
      if (remaining > FRAME_PRECISION_WINDOW_MS) {
        ctx.syncedStartTimer = window.setTimeout(fire, remaining - FRAME_PRECISION_WINDOW_MS);
        return;
      }
      if (remaining > 0) {
        nextFrame(fire);
        return;
      }
      ctx.syncedStartTimer = null;
      ctx.startSyncedPlayback();
    };
    fire();
  };

  ctx.cancelSyncedStart = () => {
    if (ctx.syncedStartTimer) window.clearTimeout(ctx.syncedStartTimer);
    ctx.syncedStartTimer = null;
    ctx.scheduledStartAt = null;
  };

  ctx.startSyncedPlayback = () => {
    ctx.scheduledStartAt = null;
    ctx.localPlaybackStarted = true;
    ctx.setPlaybackPhase();
    ctx.hideCountdown();
    ctx.hideReadyOverlay();
    ctx.showPlayerSurface();

    const started = ctx.controller?.syncPlay
      ? ctx.controller.syncPlay({ quiet: true })
      : Promise.resolve();
    Promise.resolve(started)
      .catch(error => {
        if (error?.name === 'NotAllowedError') ctx.autoplayOverlay.hidden = false;
        else console.warn('[Watch Party Start]', error);
      })
      .finally(() => {
        void ctx.enterPlayback();
      });
  };

  return ctx;
}
