import { appStore } from '../../store/app.store.js';
import { OWNER_SYNC_INTERVAL_MS, AUTO_SYNC_NOTIFICATION_COOLDOWN_MS } from './helpers.js';

export function bindSync(ctx) {
  ctx.startOwnerHeartbeat = () => {
    if (ctx.ownerHeartbeatTimer) return;
    ctx.ownerHeartbeatTimer = window.setInterval(() => {
      if (!ctx.isPartyAdmin() || !ctx.controller?.player) return;
      ctx.socket?.sendJson({
        type: 'OWNER_SYNC',
        positionMs: Math.round(ctx.controller.player.currentTime * 1000),
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
    const elapsedMs = playing ? Date.now() - serverTimeMs : 0;
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

    const elapsedMs = Math.max(0, Date.now() - (Number(payload.serverTimeMs) || Date.now()));
    return {
      ...payload,
      positionMs: Math.max(0, (Number(payload.positionMs) || 0) + elapsedMs),
      serverTimeMs: Date.now()
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

    const startServerTimeMs = Number(serverTimeMs) || Date.now();
    const liveJoinKey = `${startServerTimeMs}:${playing ? 'play' : 'pause'}`;
    if (ctx.lastLiveJoinKey === liveJoinKey) return;
    ctx.lastLiveJoinKey = liveJoinKey;

    ctx.hideReadyOverlay();
    ctx.hideCountdown();
    ctx.showPlayerSurface();

    await ctx.ensurePlayerPlayback();
    if (ctx.destroyed) return;
    ctx.setPlaybackPhase();

    const elapsedMs = playing ? Math.max(0, Date.now() - startServerTimeMs) : 0;
    const targetMs = Math.max(0, (Number(positionMs) || 0) + elapsedMs);

    if (ctx.controller?.prepareInitialPlayback) {
      await ctx.controller.prepareInitialPlayback({ position: targetMs / 1000 });
    }
    if (ctx.destroyed) return;

    await ctx.safeApplyRemoteControl({
      action: playing ? 'play' : 'pause',
      positionMs: targetMs,
      serverTimeMs: Date.now(),
      playing
    });

    ctx.maybeStartOwnerHeartbeat();
  };

  ctx.handleControlPlay = async payload => {
    try {
      const playStartServerTimeMs = Number(payload.serverTimeMs) || Date.now();
      if (ctx.lastPlayStartServerTimeMs === playStartServerTimeMs) return;
      ctx.lastPlayStartServerTimeMs = playStartServerTimeMs;

      if (ctx.party) {
        ctx.party.status = 'playing';
        ctx.party.positionMs = payload.positionMs;
        ctx.party.lastServerTimeMs = playStartServerTimeMs;
      }
      ctx.hideReadyOverlay();
      ctx.hideCountdown();
      await ctx.ensurePlayerPlayback();
      ctx.showPlayerSurface();
      if (ctx.controller?.prepareInitialPlayback) {
        await ctx.controller.prepareInitialPlayback({ position: (payload.positionMs || 0) / 1000 });
      }
      ctx.maybeStartOwnerHeartbeat();
      await ctx.safeApplyRemoteControl(payload);
    } catch (error) {
      ctx.lastPlayStartServerTimeMs = null;
      appStore.showToast(error.message || 'Wiedergabe konnte nicht gestartet werden', 'error');
    }
  };

  ctx.autoplayActivateButton.addEventListener('click', async () => {
    if (!ctx.blockedPlayPayload) return;
    await ctx.safeApplyRemoteControl(ctx.refreshRemotePayload(ctx.blockedPlayPayload));
  });

  return ctx;
}
