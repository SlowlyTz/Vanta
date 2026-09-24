import { timelinePositionAt } from './driftController.js';

export const PRELOAD_TIMEOUT_MS = 45_000;
const PRELOAD_POLL_MS = 250;
const PROGRESS_REPORT_STEP = 0.05;

export function bindReadyRoom(ctx) {
  ctx.preload = null;
  ctx.readyRequested = false;

  // Ready phase of the action bar and the member cards. The own card follows
  // the local preload, which is ahead of what the server has echoed back.
  ctx.renderReadyState = () => {
    if (!ctx.party) return;
    const { title, status, readyButton } = ctx.actionBar;
    const members = ctx.party.members || [];
    const readyCount = members.filter(member => member.ready).length;
    const inReadyRoom = ctx.party.status === 'ready-room';
    const preload = ctx.preload;
    const percent = Math.round((preload?.progress || 0) * 100);

    readyButton.hidden = !inReadyRoom;
    readyButton.disabled = !inReadyRoom || (ctx.readyRequested && preload?.status !== 'error');
    readyButton.classList.toggle('is-done', Boolean(preload?.sentReady));
    readyButton.classList.toggle('is-loading', ctx.readyRequested && !preload?.sentReady && preload?.status !== 'error');
    readyButton.style.setProperty('--progress', String(preload?.progress || 0));
    if (preload?.status === 'error') {
      readyButton.textContent = 'Erneut versuchen';
    } else if (preload?.sentReady) {
      readyButton.textContent = 'Bereit ✓';
    } else if (ctx.readyRequested) {
      const approx = preload?.approx ? 'ca. ' : '';
      readyButton.textContent = preload?.etaSeconds
        ? `Wird geladen … ${approx}${percent} % · noch ca. ${preload.etaSeconds} s`
        : `Wird geladen … ${approx}${percent} %`;
    } else {
      readyButton.textContent = 'Bereit';
    }

    if (ctx.party.status === 'countdown') {
      title.textContent = 'Alle sind bereit';
      status.textContent = 'Gleich geht’s los …';
    } else if (preload?.status === 'error') {
      title.textContent = 'Laden fehlgeschlagen';
      status.textContent = preload.message;
    } else {
      title.textContent = 'Bereit machen';
      status.textContent = readyCount === members.length && members.length > 0
        ? 'Alle sind bereit. Der Countdown startet gleich.'
        : `${readyCount} von ${members.length} bereit`;
    }
  };

  ctx.renderReadyOverlay = () => {
    ctx.renderMembers();
    ctx.renderReadyState();
  };

  // The ready phase stays in the lobby; the player loads unseen behind it.
  ctx.showReadyRoom = () => {
    ctx.lobby.hidden = false;
    ctx.lobby.dataset.phase = ctx.party?.status === 'countdown' ? 'countdown' : 'ready';
    ctx.autoplayOverlay.hidden = true;
    ctx.setSyncStatus('preparing', 'Bereitmachen');
    ctx.renderReadyOverlay();
  };

  const reportPreload = (state, extra = {}) => {
    ctx.socket?.sendJson({ type: 'PLAYER_READY_STATE', state, ...extra });
  };

  const sendReadyIfDue = () => {
    const preload = ctx.preload;
    if (!ctx.readyRequested || preload?.status !== 'loaded' || preload.sentReady) return;
    if (!['ready-room', 'switching'].includes(ctx.party?.status)) return;
    preload.sentReady = true;
    ctx.socket?.sendJson({ type: 'PLAYER_READY' });
  };

  const waitForBuffer = (preload, positionSeconds) => new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let lastReported = 0;
    const poll = () => {
      if (ctx.destroyed || ctx.preload !== preload) {
        resolve(false);
        return;
      }
      // The player measures the load (buffer, the segment downloading,
      // Jellyfin's transcoding) and estimates the time left.
      const measured = ctx.controller?.getLoadProgress?.(positionSeconds);
      const progress = measured ? measured.fraction : 1;
      preload.progress = progress;
      const eta = measured?.etaSeconds ?? null;
      const approx = Boolean(measured?.approx);
      if (eta !== preload.etaSeconds || approx !== Boolean(preload.approx)) {
        preload.etaSeconds = eta;
        preload.approx = approx;
        ctx.renderReadyOverlay();
      }
      if (progress >= 1) {
        resolve(true);
        return;
      }
      if (progress - lastReported >= PROGRESS_REPORT_STEP) {
        lastReported = progress;
        reportPreload('preparing', { progress: Math.round(progress * 100) / 100 });
        ctx.renderReadyOverlay();
      }
      if (Date.now() - startedAt > PRELOAD_TIMEOUT_MS) {
        reject(new Error('Das Video konnte nicht rechtzeitig vorgeladen werden.'));
        return;
      }
      preload.timer = window.setTimeout(poll, PRELOAD_POLL_MS);
    };
    poll();
  });

  // Loads the source paused at the start position and waits for a few
  // seconds of buffer, so the countdown can end in an instant start.
  ctx.startPreload = async () => {
    if (!ctx.controller || ctx.preload?.status === 'loading' || ctx.preload?.status === 'loaded') return;
    const preload = { status: 'loading', progress: 0, sentReady: false, message: '', timer: null };
    ctx.preload = preload;
    reportPreload('preparing', { progress: 0 });
    ctx.renderReadyOverlay();

    const positionSeconds = timelinePositionAt(ctx.timeline, ctx.clock.now()) / 1000;
    try {
      await ctx.controller.prepareInitialPlayback?.({ position: positionSeconds });
      const loaded = await waitForBuffer(preload, positionSeconds);
      if (!loaded) return;
      preload.status = 'loaded';
      preload.progress = 1;
      if (ctx.readyRequested) sendReadyIfDue();
      else reportPreload('loaded', { progress: 1 });
    } catch (error) {
      if (ctx.preload !== preload) return;
      preload.status = 'error';
      preload.message = error.message || 'Player konnte nicht vorbereitet werden.';
      ctx.readyRequested = false;
      reportPreload('error', { message: preload.message });
    } finally {
      if (ctx.preload === preload) ctx.renderReadyOverlay();
    }
  };

  ctx.resetPreload = () => {
    if (ctx.preload?.timer) window.clearTimeout(ctx.preload.timer);
    ctx.preload = null;
    ctx.readyRequested = false;
  };

  ctx.handleReadyClick = () => {
    if (ctx.party?.status !== 'ready-room') return;

    if (ctx.preload?.status === 'error') {
      ctx.preload = null;
      void ctx.startPreload();
      return;
    }
    if (ctx.readyRequested) return;

    // Still inside the click: the only moment the browser allows unlocking
    // unmuted playback for the synced start later on.
    ctx.controller?.unlockPlayback?.();
    ctx.readyRequested = true;
    sendReadyIfDue();
    if (!ctx.preload) void ctx.startPreload();
    ctx.renderReadyOverlay();
  };

  ctx.ensurePlayerReadyRoom = async () => {
    if (ctx.controller) {
      ctx.showReadyRoom();
      if (ctx.watchPartyConfig) ctx.watchPartyConfig.phase = 'ready-room';
    } else {
      await ctx.mountPlayer({
        itemId: ctx.party.playableItemId,
        positionMs: ctx.party.positionMs,
        phase: 'ready-room',
        deferInitialLoad: true
      });
    }
    if (ctx.destroyed) return;
    ctx.preloadCountdownScene();
    if (ctx.party?.status === 'ready-room') void ctx.startPreload();
  };

  return ctx;
}
