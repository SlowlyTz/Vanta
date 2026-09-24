import { appStore } from '../../store/app.store.js';
import { createElement } from '../../utils/dom.js';
import { OWNER_SYNC_INTERVAL_MS, AUTO_SYNC_NOTIFICATION_COOLDOWN_MS } from './helpers.js';
import { createDriftController, timelinePositionAt } from './driftController.js';

export { timelinePositionAt };

// A local command is applied to our own timeline right away, before the
// server confirms it; otherwise the drift loop would pull the player back
// to the old timeline for one round trip. The guess expires if the server
// never answers (e.g. it rejected the command).
const LOCAL_TIMELINE_TTL_MS = 3_000;
// How often the own player state goes to the others when nothing changes.
export const STATUS_REPORT_MS = 2_000;
const REPORTABLE_STATES = new Set(['sync', 'correcting', 'buffering', 'paused', 'blocked']);

export function timelineFromParty(party) {
  if (!party) return null;
  if (party.timeline) return party.timeline;
  return {
    positionMs: Number(party.positionMs) || 0,
    playing: party.status === 'playing' || party.status === 'countdown',
    anchorServerTimeMs: Number(party.lastServerTimeMs) || 0,
    seq: 0
  };
}

export function syncStatusLabel({ status, driftMs }) {
  switch (status) {
    case 'sync':
      return ['sync', `Synchron · ±${Math.round(Math.abs(driftMs || 0))} ms`];
    case 'paused':
      return ['sync', 'Pausiert · synchron'];
    case 'correcting':
      return ['preparing', 'Synchronisiert …'];
    case 'buffering':
      return ['preparing', 'Puffert …'];
    case 'blocked':
      return ['lost', 'Wiedergabe blockiert'];
    default:
      return ['preparing', 'Wird vorbereitet'];
  }
}

function debugSyncEnabled() {
  try {
    return window.localStorage.getItem('vanta.debug.sync') === '1';
  } catch {
    return false;
  }
}

export function bindSync(ctx) {
  ctx.acceptTimeline = timeline => {
    if (!timeline || !Number.isFinite(Number(timeline.seq))) return false;
    const current = ctx.timeline;
    if (current) {
      const localGuess = current.local && ctx.clock.now() - current.anchorServerTimeMs < LOCAL_TIMELINE_TTL_MS;
      if (timeline.seq < current.seq) return false;
      if (timeline.seq === current.seq && localGuess) return false;
    }
    ctx.timeline = timeline;
    return true;
  };

  ctx.sendOwnerControl = (type, positionMs, extra = {}) => {
    const atServerTimeMs = ctx.clock.now();
    ctx.socket?.sendJson({ type, positionMs, atServerTimeMs, ...extra });
    if (type === 'OWNER_SYNC') return;

    const playing = type === 'OWNER_PLAY' ? true : type === 'OWNER_PAUSE' ? false : Boolean(ctx.timeline?.playing);
    ctx.timeline = {
      positionMs,
      playing,
      anchorServerTimeMs: atServerTimeMs,
      seq: ctx.timeline?.seq ?? 0,
      local: true
    };
  };

  ctx.debugOverlay = debugSyncEnabled()
    ? createElement('pre', { className: 'watch-party-sync-debug', 'aria-hidden': 'true' })
    : null;
  if (ctx.debugOverlay) ctx.container.appendChild(ctx.debugOverlay);

  ctx.renderSyncDebug = status => {
    if (!ctx.debugOverlay) return;
    ctx.debugOverlay.textContent = [
      `status  ${status.status}`,
      `drift   ${status.driftMs === null ? '–' : `${Math.round(status.driftMs)} ms`}`,
      `rate    ${Number(status.rate || 1).toFixed(3)}`,
      `rtt     ${ctx.clock.rtt === null ? '–' : `${Math.round(ctx.clock.rtt)} ms`}`,
      `offset  ${Math.round(ctx.clock.offset)} ms`,
      `seek    ${status.seekLatencyMs} ms`,
      `seq     ${ctx.timeline?.seq ?? '–'}${ctx.timeline?.local ? ' (lokal)' : ''}`,
      `leader  ${ctx.isSyncLeader() ? 'ja' : 'nein'}`
    ].join('\n');
  };

  let lastStatusReport = { state: null, at: 0 };
  ctx.reportPlayerStatus = status => {
    if (!REPORTABLE_STATES.has(status.status)) return;
    const now = Date.now();
    if (status.status === lastStatusReport.state && now - lastStatusReport.at < STATUS_REPORT_MS) return;
    lastStatusReport = { state: status.status, at: now };
    const bufferedSeconds = Number(ctx.controller?.getBufferedAhead?.());
    ctx.socket?.sendJson({
      type: 'PLAYER_STATUS',
      state: status.status,
      driftMs: Number.isFinite(status.driftMs) ? Math.round(status.driftMs) : null,
      // Lets the server tell when a member it waits for has enough video again.
      bufferedMs: Number.isFinite(bufferedSeconds) ? Math.round(bufferedSeconds * 1000) : null
    });
  };

  ctx.handleSyncStatus = status => {
    ctx.syncInfo = status;
    ctx.reportPlayerStatus(status);
    const [kind, label] = syncStatusLabel(status);
    ctx.setSyncStatus(kind, label);
    if (status.status !== 'blocked' && !ctx.autoplayOverlay.hidden) ctx.autoplayOverlay.hidden = true;
    ctx.renderSyncDebug(status);
  };

  ctx.drift = createDriftController({
    getController: () => ctx.controller,
    getTimeline: () => ctx.timeline,
    now: () => ctx.clock.now(),
    onStatus: ctx.handleSyncStatus,
    onHardSeek: () => {
      const now = Date.now();
      if (now - ctx.lastAutoSyncNotificationAt <= AUTO_SYNC_NOTIFICATION_COOLDOWN_MS) return;
      ctx.lastAutoSyncNotificationAt = now;
      ctx.showWatchPartyNotification({
        type: 'auto_sync',
        icon: 'auto_sync',
        message: 'Wiedergabe automatisch synchronisiert.'
      });
    },
    onAutoplayBlocked: () => {
      ctx.autoplayOverlay.hidden = false;
    }
  });

  ctx.handleTimelineMessage = ({ timeline, actorUserId, actorName, reason, step }) => {
    if (!timeline || !(timeline.seq > ctx.lastAppliedTimelineSeq)) return;
    ctx.lastAppliedTimelineSeq = timeline.seq;
    if (!ctx.acceptTimeline(timeline)) return;
    if (ctx.party) {
      ctx.party.timeline = timeline;
      ctx.party.positionMs = timeline.positionMs;
      ctx.party.lastServerTimeMs = timeline.anchorServerTimeMs;
      ctx.party.status = timeline.playing ? 'playing' : 'paused';
    }

    // The next episode starts for everyone at the same moment, slightly
    // ahead, exactly like the end of the countdown.
    if (reason === 'episode-start') {
      ctx.switchingItemId = null;
      ctx.scheduleSyncedStart(timeline.anchorServerTimeMs);
      return;
    }

    // Our own command coming back: the local player is already there.
    if (actorUserId && actorUserId === ctx.currentUser?.id) return;
    if (reason === 'seek' && Number.isFinite(Number(step)) && Number(step) !== 0) {
      ctx.controller?.showSeekFeedback?.(Number(step), { by: actorName || null });
    }
    void ctx.enterPlayback();
  };

  // Brings the player onto the timeline: mounts and loads it if needed, then
  // hands over to the drift loop. Safe to call again at any time.
  ctx.enterPlayback = () => {
    if (ctx.destroyed) return Promise.resolve();
    if (ctx.playbackEntering) return ctx.playbackEntering;
    if (ctx.playbackEntered && ctx.controller) {
      ctx.drift.tick();
      return Promise.resolve();
    }

    ctx.playbackEntering = (async () => {
      ctx.hideCountdown();
      ctx.showPlayerSurface();

      await ctx.ensurePlayerPlayback();
      if (ctx.destroyed || !ctx.controller) return;
      ctx.setPlaybackPhase();

      const positionMs = timelinePositionAt(ctx.timeline, ctx.clock.now());
      await ctx.controller.prepareInitialPlayback?.({ position: positionMs / 1000 });
      if (ctx.destroyed || !ctx.controller) return;

      ctx.playbackEntered = true;
      ctx.drift.start();
      ctx.drift.tick();
      ctx.maybeStartOwnerHeartbeat();
    })()
      .catch(error => {
        console.error('[Watch Party Playback]', error);
        if (!ctx.destroyed) appStore.showToast(error.message || 'Wiedergabe konnte nicht gestartet werden', 'error');
      })
      .finally(() => {
        ctx.playbackEntering = null;
      });

    return ctx.playbackEntering;
  };

  ctx.leavePlayback = () => {
    ctx.drift.stop();
    ctx.playbackEntered = false;
  };

  ctx.isSyncLeader = () => Boolean(ctx.currentUser?.id) && ctx.party?.syncLeaderUserId === ctx.currentUser.id;

  ctx.sendHeartbeat = () => {
    if (!ctx.isSyncLeader() || !ctx.controller?.player) return;
    const state = ctx.controller.getSyncState?.();
    ctx.sendOwnerControl('OWNER_SYNC', Math.round(ctx.controller.player.currentTime * 1000), {
      playing: !ctx.controller.player.paused,
      buffering: Boolean(state?.busy),
      stableMs: state ? Math.round(state.stableMs) : 0
    });
  };

  ctx.startOwnerHeartbeat = () => {
    if (ctx.ownerHeartbeatTimer) return;
    ctx.ownerHeartbeatTimer = window.setInterval(ctx.sendHeartbeat, OWNER_SYNC_INTERVAL_MS);
  };

  ctx.stopOwnerHeartbeat = () => {
    if (!ctx.ownerHeartbeatTimer) return;
    window.clearInterval(ctx.ownerHeartbeatTimer);
    ctx.ownerHeartbeatTimer = null;
  };

  ctx.shouldRunOwnerHeartbeat = () => {
    return ctx.isSyncLeader() && Boolean(ctx.controller?.player) && ['playing', 'paused'].includes(ctx.party?.status);
  };

  // Leadership moves when the owner drops out or comes back, so this runs on
  // every party update and stops a heartbeat that is no longer ours.
  ctx.maybeStartOwnerHeartbeat = () => {
    if (ctx.shouldRunOwnerHeartbeat()) ctx.startOwnerHeartbeat();
    else ctx.stopOwnerHeartbeat();
  };

  ctx.autoplayActivateButton.addEventListener('click', () => {
    if (!ctx.controller?.syncPlay) return;
    // Called straight from the click so the browser counts it as a gesture.
    ctx.controller.syncPlay({ quiet: false })
      .then(() => {
        ctx.autoplayOverlay.hidden = true;
        ctx.drift.tick();
      })
      .catch(error => console.warn('[Watch Party Autoplay]', error));
  });

  return ctx;
}
