import { createElement } from '../../utils/dom.js';
import { memberInitial } from './helpers.js';
import { timelinePositionAt } from './driftController.js';

// Seconds of video that must sit in the buffer at the start position before
// a member counts as loaded: enough that the synced start never stalls.
export const PRELOAD_TARGET_SECONDS = 4;
export const PRELOAD_TIMEOUT_MS = 45_000;
const PRELOAD_POLL_MS = 250;
const PROGRESS_REPORT_STEP = 0.05;

export function preloadProgress({ bufferedAhead, position, duration }) {
  if (Number.isFinite(duration) && duration > 0 && position + bufferedAhead >= duration - 0.5) return 1;
  return Math.min(1, Math.max(0, bufferedAhead / PRELOAD_TARGET_SECONDS));
}

export function readyStateLabel(member) {
  if (member.ready || member.preloadState === 'ready') return 'Bereit';
  if (member.preloadState === 'loaded') return 'Geladen';
  if (member.preloadState === 'preparing') {
    const percent = Math.round((Number(member.preloadProgress) || 0) * 100);
    return percent > 0 ? `Lädt ${percent} %` : 'Wird vorbereitet …';
  }
  if (member.preloadState === 'error') return member.preloadMessage || 'Fehler';
  return 'Wartet';
}

export function readyStateClass(member) {
  if (member.ready || member.preloadState === 'ready') return 'is-ready';
  if (member.preloadState === 'preparing' || member.preloadState === 'loaded') return 'is-preparing';
  if (member.preloadState === 'error') return 'is-error';
  return 'is-idle';
}

export function bindReadyRoom(ctx) {
  ctx.preload = null;
  ctx.readyRequested = false;

  ctx.renderReadyOverlay = () => {
    if (!ctx.party) return;
    ctx.readyMembersList.innerHTML = '';

    ctx.party.members.forEach(member => {
      ctx.readyMembersList.appendChild(createElement('li', {
        className: `watch-party-ready-member ${readyStateClass(member)}`
      },
        createElement('span', { className: 'watch-party-member-avatar' }, memberInitial(member.username)),
        createElement('span', { className: 'watch-party-ready-member-name' }, `${member.username}${member.userId === ctx.currentUser?.id ? ' (Du)' : ''}`),
        createElement('span', { className: 'watch-party-ready-member-state' }, readyStateLabel(member))
      ));
    });

    const allReady = ctx.party.members.length > 0 && ctx.party.members.every(member => member.ready);
    const inReadyRoom = ctx.party.status === 'ready-room';
    const preload = ctx.preload;
    const percent = Math.round((preload?.progress || 0) * 100);

    ctx.readyButton.hidden = !inReadyRoom;
    ctx.readyButton.disabled = !inReadyRoom || (ctx.readyRequested && preload?.status !== 'error');
    if (preload?.status === 'error') {
      ctx.readyButton.textContent = 'Erneut versuchen';
    } else if (preload?.sentReady) {
      ctx.readyButton.textContent = 'Bereit ✓';
    } else if (ctx.readyRequested) {
      ctx.readyButton.textContent = `Wird geladen … ${percent} %`;
    } else {
      ctx.readyButton.textContent = 'Bereit';
    }

    if (preload?.status === 'error') {
      ctx.readyStatus.textContent = preload.message;
    } else if (ctx.party.status === 'countdown') {
      ctx.readyStatus.textContent = 'Alle sind bereit. Countdown läuft.';
    } else if (allReady) {
      ctx.readyStatus.textContent = 'Alle sind bereit. Countdown startet gleich.';
    } else {
      ctx.readyStatus.textContent = 'Warte, bis alle Teilnehmer bereit sind.';
    }
  };

  ctx.hideReadyOverlay = () => {
    ctx.readyOverlay.hidden = true;
  };

  ctx.showReadyRoom = () => {
    ctx.showPlayerSurface();
    ctx.readyOverlay.hidden = false;
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
    if (ctx.party?.status !== 'ready-room') return;
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
      const controller = ctx.controller;
      const progress = preloadProgress({
        bufferedAhead: controller?.getBufferedAhead?.(positionSeconds) ?? PRELOAD_TARGET_SECONDS,
        position: positionSeconds,
        duration: Number(controller?.player?.duration)
      });
      preload.progress = progress;
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
    if (!ctx.destroyed && ctx.party?.status === 'ready-room') void ctx.startPreload();
  };

  return ctx;
}
