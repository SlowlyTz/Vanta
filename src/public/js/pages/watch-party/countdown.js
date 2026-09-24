import { COUNTDOWN_MODULE_URL, countdownMetaParts, formatPosition } from './helpers.js';

// Close to the start a timer is too coarse; the last few milliseconds are
// waited out frame by frame against the server clock.
const FRAME_PRECISION_WINDOW_MS = 40;
// Matches the scene: the overlay fades out over the last 0.4 s.
const FADE_WINDOW_MS = 400;

export function countdownDigit(remainingMs, durationMs = 5000) {
  const maxDigit = Math.round(durationMs / 1000);
  return Math.min(maxDigit, Math.max(0, Math.ceil(remainingMs / 1000)));
}

export function overlayOpacity(remainingMs) {
  return Math.min(1, Math.max(0, remainingMs / FADE_WINDOW_MS));
}

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

export function bindCountdown(ctx) {
  const nextFrame = callback => (window.requestAnimationFrame
    ? window.requestAnimationFrame(callback)
    : window.setTimeout(callback, 16));
  const cancelFrame = id => (window.cancelAnimationFrame
    ? window.cancelAnimationFrame(id)
    : window.clearTimeout(id));

  let scene = null;
  let sceneToken = 0;
  let fallbackFrame = null;

  // Fetches the scene (three.js included) and, once the browser is idle,
  // loads the font and samples the digits, so the countdown starts with the
  // particles at once instead of a stand-in digit.
  ctx.preloadCountdownScene = () => {
    if (!ctx.countdownModule) {
      ctx.countdownModule = import(/* @vite-ignore */ COUNTDOWN_MODULE_URL).catch(error => {
        console.warn('[Watch Party Countdown] scene unavailable:', error?.message);
        ctx.countdownModule = null;
        return null;
      });
      void ctx.countdownModule.then(module => {
        if (!module?.prepareCountdown) return;
        const idle = window.requestIdleCallback || (callback => window.setTimeout(callback, 200));
        idle(() => { module.prepareCountdown().catch(() => {}); });
      });
    }
    return ctx.countdownModule;
  };

  // Only when the 3D scene cannot run at all (no module, no WebGL).
  const showFallbackDigit = () => {
    ctx.countdownOverlay.classList.remove('is-awaiting-3d');
  };

  const stopFallback = () => {
    if (fallbackFrame !== null) cancelFrame(fallbackFrame);
    fallbackFrame = null;
  };

  const runFallback = ({ startsAtServerTimeMs, durationMs }) => {
    stopFallback();
    const draw = () => {
      const remaining = startsAtServerTimeMs - ctx.clock.now();
      ctx.countdownNumber.textContent = String(Math.max(1, countdownDigit(remaining, durationMs)));
      if (!ctx.countdownOverlay.classList.contains('is-3d')) {
        ctx.countdownOverlay.style.opacity = String(overlayOpacity(remaining));
      }
      fallbackFrame = remaining > 0 ? nextFrame(draw) : null;
    };
    draw();
  };

  const destroyScene = () => {
    ctx.countdownOverlay.classList.remove('is-awaiting-3d');
    sceneToken += 1;
    scene?.destroy();
    scene = null;
    ctx.countdownOverlay.classList.remove('is-3d');
  };

  const mountScene = async ({ startsAtServerTimeMs, durationMs }) => {
    const token = ++sceneToken;
    const module = await ctx.preloadCountdownScene();
    if (token !== sceneToken || ctx.countdownOverlay.hidden) return;
    if (!module) {
      showFallbackDigit();
      return;
    }
    try {
      const mounted = await module.mountCountdown({
        container: ctx.countdownStage,
        fadeTarget: ctx.countdownOverlay,
        startsAtServerTimeMs,
        durationMs,
        now: () => ctx.clock.now()
      });
      if (token !== sceneToken || ctx.countdownOverlay.hidden) {
        mounted.destroy();
        return;
      }
      scene = mounted;
      ctx.countdownOverlay.classList.remove('is-awaiting-3d');
      ctx.countdownOverlay.classList.add('is-3d');
    } catch (error) {
      // No WebGL or a lost context: the fallback keeps counting.
      console.warn('[Watch Party Countdown] falling back:', error?.message);
      if (token === sceneToken) showFallbackDigit();
    }
  };

  ctx.showCountdown = ({ startsAtServerTimeMs, durationMs = 5000, positionMs }) => {
    destroyScene();
    ctx.countdownOverlay.hidden = false;
    ctx.countdownOverlay.style.opacity = '';

    const snapshot = ctx.party?.itemSnapshot || {};
    const metaParts = countdownMetaParts(snapshot);
    ctx.countdownTitle.textContent = snapshot.name || 'Unbekanntes Medium';
    ctx.countdownMeta.textContent = metaParts.join(' · ');
    ctx.countdownMeta.hidden = metaParts.length === 0;
    ctx.countdownPosition.textContent = formatPosition(positionMs);
    ctx.countdownLive.textContent = `${snapshot.name || 'Die Wiedergabe'} startet in ${Math.round(durationMs / 1000)} Sekunden.`;

    runFallback({ startsAtServerTimeMs, durationMs });
    if (!prefersReducedMotion()) {
      // Until the scene is up only the backdrop and the title show, however
      // long it takes; the plain digit appears only if the scene fails.
      ctx.countdownOverlay.classList.add('is-awaiting-3d');
      void mountScene({ startsAtServerTimeMs, durationMs });
    }
  };

  ctx.hideCountdown = () => {
    ctx.countdownOverlay.hidden = true;
    ctx.countdownOverlay.style.opacity = '';
    stopFallback();
    destroyScene();
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
