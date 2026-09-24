import { appStore } from '../../store/app.store.js';
import { OWNER_SYNC_INTERVAL_MS, AUTO_SYNC_NOTIFICATION_COOLDOWN_MS } from './helpers.js';

export function timelinePositionAt(timeline, now) {
  const positionMs = Number(timeline?.positionMs) || 0;
  if (!timeline?.playing) return positionMs;
  return positionMs + Math.max(0, now - (Number(timeline.anchorServerTimeMs) || now));
}

export function timelineToControl(timeline, reason) {
  return {
    action: reason === 'seek' ? 'seek' : (timeline.playing ? 'play' : 'pause'),
    positionMs: timeline.positionMs,
    serverTimeMs: timeline.anchorServerTimeMs,
    playing: Boolean(timeline.playing)
  };
}

export function bindSync(ctx) {
  // Keeps the newest known timeline; anything older than what we hold is a
  // late packet and dropped.
  ctx.acceptTimeline = timeline => {
    if (!timeline || !Number.isFinite(Number(timeline.seq))) return false;
    if (ctx.timeline && timeline.seq < ctx.timeline.seq) return false;
    ctx.timeline = timeline;
    return true;
  };

  ctx.sendOwnerControl = (type, positionMs, extra = {}) => {
    ctx.socket?.sendJson({ type, positionMs, atServerTimeMs: ctx.clock.now(), ...extra });
  };

  ctx.handleTimelineMessage = ({ timeline, actorUserId, reason }) => {
    if (!timeline || !(timeline.seq > ctx.lastAppliedTimelineSeq)) return;
    ctx.lastAppliedTimelineSeq = timeline.seq;
    ctx.acceptTimeline(timeline);
    if (ctx.party) {
      ctx.party.timeline = timeline;
      ctx.party.positionMs = timeline.positionMs;
      ctx.party.lastServerTimeMs = timeline.anchorServerTimeMs;
      ctx.party.status = timeline.playing ? 'playing' : 'paused';
    }

    // Our own command coming back: the local player is already there.
    if (actorUserId && actorUserId === ctx.currentUser?.id) return;

    if (reason === 'sync') {
      ctx.applySync({
        positionMs: timeline.positionMs,
        playing: timeline.playing,
        serverTimeMs: timeline.anchorServerTimeMs
      });
      return;
    }

    const payload = timelineToControl(timeline, reason);
    if (reason === 'start' || !ctx.controller) {
      void ctx.handleControlPlay(payload);
      return;
    }
    void ctx.safeApplyRemoteControl(payload);
  };

  ctx.startOwnerHeartbeat = () => {
    if (ctx.ownerHeartbeatTimer) return;
    ctx.ownerHeartbeatTimer = window.setInterval(() => {
      if (!ctx.isPartyAdmin() || !ctx.controller?.player) return;
      ctx.sendOwnerControl('OWNER_SYNC', Math.round(ctx.controller.player.currentTime * 1000), {
        playing: !ctx.controller.player.paused
      });
    }, OWNER_SYNC_INTERVAL_MS);
  };

  ctx.shouldRunOwnerHeartbeat = () => {
    return ctx.isPartyAdmin() && Boolean(ctx.controller?.player) && ['playing', 'paused'].includes(ctx.party?.status);
  };

  ctx.maybeStartOwnerHeartbeat = () => {
    if (!ctx.shouldRunOwnerHeartbeat()) return;
    ctx.startOwnerHeartbeat();
  };

  ctx.applySync = ({ positionMs, playing, serverTimeMs }) => {
    if (!ctx.controller?.player) return;
    const elapsedMs = playing ? ctx.clock.now() - serverTimeMs : 0;
    const targetSeconds = (positionMs + elapsedMs) / 1000;
    const drift = ctx.controller.player.currentTime - targetSeconds;

    if (Math.abs(drift) > 2.5) {
      ctx.controller.player.currentTime = Math.max(0, targetSeconds);
      ctx.setSyncStatus('preparing', 'Synchronisiert …');
      const now = Date.now();
      if (now - ctx.lastAutoSyncNotificationAt > AUTO_SYNC_NOTIFICATION_COOLDOWN_MS) {
        ctx.lastAutoSyncNotificationAt = now;
        ctx.showWatchPartyNotification({
          type: 'auto_sync',
          icon: 'auto_sync',
          message: 'Wiedergabe automatisch synchronisiert.'
        });
      }
      return;
    }

    if (playing && Math.abs(drift) > 0.35) {
      ctx.controller.player.playbackRate = drift > 0 ? 0.98 : 1.02;
      ctx.setSyncStatus('preparing', 'Synchronisiert …');
      window.setTimeout(() => {
        if (ctx.controller?.player) ctx.controller.player.playbackRate = 1;
      }, 2500);
      return;
    }

    ctx.setSyncStatus('sync', 'Synchron');
  };

  ctx.refreshRemotePayload = payload => {
    if (payload.action !== 'play') return payload;

    const now = ctx.clock.now();
    const elapsedMs = Math.max(0, now - (Number(payload.serverTimeMs) || now));
    return {
      ...payload,
      positionMs: Math.max(0, (Number(payload.positionMs) || 0) + elapsedMs),
      serverTimeMs: now
    };
  };

  ctx.safeApplyRemoteControl = async payload => {
    if (!ctx.controller) return;
    try {
      await ctx.controller.applyRemoteControl(payload);
      ctx.blockedPlayPayload = null;
      ctx.autoplayOverlay.hidden = true;
    } catch (error) {
      if (payload.action === 'play') {
        ctx.blockedPlayPayload = payload;
        ctx.autoplayOverlay.hidden = false;
      } else {
        console.warn('[Watch Party Remote Control]', error);
      }
    }
  };

  ctx.enterLivePlayback = async ({ positionMs, serverTimeMs, playing }) => {
    if (ctx.destroyed) return;

    const startServerTimeMs = Number(serverTimeMs) || ctx.clock.now();
    const liveJoinKey = `${startServerTimeMs}:${playing ? 'play' : 'pause'}`;
    if (ctx.lastLiveJoinKey === liveJoinKey) return;
    ctx.lastLiveJoinKey = liveJoinKey;

    ctx.hideReadyOverlay();
    ctx.hideCountdown();
    ctx.showPlayerSurface();

    await ctx.ensurePlayerPlayback();
    if (ctx.destroyed) return;
    ctx.setPlaybackPhase();

    const elapsedMs = playing ? Math.max(0, ctx.clock.now() - startServerTimeMs) : 0;
    const targetMs = Math.max(0, (Number(positionMs) || 0) + elapsedMs);

    if (ctx.controller?.prepareInitialPlayback) {
      await ctx.controller.prepareInitialPlayback({ position: targetMs / 1000 });
    }
    if (ctx.destroyed) return;

    await ctx.safeApplyRemoteControl({
      action: playing ? 'play' : 'pause',
      positionMs: targetMs,
      serverTimeMs: ctx.clock.now(),
      playing
    });

    ctx.maybeStartOwnerHeartbeat();
  };

  ctx.handleControlPlay = async payload => {
    try {
      ctx.hideReadyOverlay();
      ctx.hideCountdown();
      await ctx.ensurePlayerPlayback();
      ctx.showPlayerSurface();
      if (ctx.controller?.prepareInitialPlayback) {
        const positionMs = payload.playing
          ? timelinePositionAt({ ...payload, anchorServerTimeMs: payload.serverTimeMs }, ctx.clock.now())
          : payload.positionMs;
        await ctx.controller.prepareInitialPlayback({ position: (positionMs || 0) / 1000 });
      }
      ctx.maybeStartOwnerHeartbeat();
      await ctx.safeApplyRemoteControl(payload);
    } catch (error) {
      appStore.showToast(error.message || 'Wiedergabe konnte nicht gestartet werden', 'error');
    }
  };

  ctx.autoplayActivateButton.addEventListener('click', async () => {
    if (!ctx.blockedPlayPayload) return;
    await ctx.safeApplyRemoteControl(ctx.refreshRemotePayload(ctx.blockedPlayPayload));
  });

  return ctx;
}
