import { MediaApi } from '../../api/media.api.js';
import { appStore } from '../../store/app.store.js';
import { loadEpisodeContext } from '../../utils/episodeContext.js';
import { PLAYER_MODULE_URL, getPosterUrl } from './helpers.js';

export function bindPlayerMount(ctx) {
  ctx.ensurePlayerMountAttached = () => {
    if (!ctx.playerMount.isConnected) {
      ctx.container.insertBefore(ctx.playerMount, ctx.countdownOverlay);
    }
  };

  // During the ready phase the player loads out of sight behind the lobby
  // (kept rendered, not display:none, so the browser decodes the first frame).
  ctx.attachHiddenPlayer = () => {
    ctx.ensurePlayerMountAttached();
    if (ctx.playerMount.classList.contains('player-page')) return;
    ctx.playerMount.classList.add('vanta-player-root', 'is-preloading');
    ctx.playerMount.setAttribute('aria-hidden', 'true');
    ctx.playerMount.inert = true;
  };

  ctx.showPlayerSurface = () => {
    ctx.lobby.hidden = true;
    ctx.ensurePlayerMountAttached();
    ctx.playerMount.removeAttribute('aria-hidden');
    ctx.playerMount.inert = false;
    ctx.playerMount.classList.remove('is-preloading');
    ctx.playerMount.classList.add('player-page', 'vanta-player-root');
    ctx.lockPlayerViewport();
  };

  ctx.setPlaybackPhase = () => {
    if (ctx.watchPartyConfig) ctx.watchPartyConfig.phase = 'playback';
  };

  ctx.applyMountedPhase = phase => {
    if (phase === 'ready-room') {
      ctx.attachHiddenPlayer();
      ctx.showReadyRoom();
    } else {
      ctx.showPlayerSurface();
    }
    if (ctx.watchPartyConfig) ctx.watchPartyConfig.phase = phase;
  };

  ctx.mountPlayer = async ({ itemId, positionMs, force = false, phase = 'playback', deferInitialLoad = false }) => {
    if (ctx.destroyed) return;

    if (ctx.controller && !force) {
      ctx.applyMountedPhase(phase);
      return;
    }

    if (ctx.mountInFlight && !force) {
      await ctx.mountInFlight;
      if (ctx.destroyed) return;
      if (ctx.controller) ctx.applyMountedPhase(phase);
      return;
    }

    if (phase === 'ready-room') {
      ctx.attachHiddenPlayer();
      ctx.showReadyRoom();
    } else {
      ctx.showPlayerSurface();
    }
    ctx.setSyncStatus('preparing', 'Wird vorbereitet');

    ctx.mountInFlight = (async () => {
      try {
        const [item, playerModule] = await Promise.all([
          MediaApi.getItem(itemId),
          import(PLAYER_MODULE_URL)
        ]);
        if (ctx.destroyed) return;

        const episodeContext = await loadEpisodeContext(item).catch(() => null);
        if (ctx.destroyed) return;

        ctx.watchPartyConfig = {
          enabled: true,
          phase,
          isOwner: ctx.isPartyAdmin(), // Übergangskompatibilität für ältere Player-Gates
          canControl: ctx.isPartyAdmin(),
          currentUserId: ctx.currentUser?.id,
          participants: ctx.party.members,
          disableQualityMenu: true,
          serverNow: () => ctx.clock.now(),
          onOwnerPlay: ownerPositionMs => ctx.sendOwnerControl('OWNER_PLAY', ownerPositionMs),
          onOwnerPause: ownerPositionMs => ctx.sendOwnerControl('OWNER_PAUSE', ownerPositionMs),
          onOwnerSeek: ownerPositionMs => ctx.sendOwnerControl('OWNER_SEEK', ownerPositionMs),
          onPromoteMember: targetUserId => ctx.socket?.sendJson({ type: 'ADMIN_PROMOTE_MEMBER', targetUserId }),
          onBanMember: targetUserId => ctx.socket?.sendJson({ type: 'ADMIN_BAN_MEMBER', targetUserId })
        };

        ctx.controller = await playerModule.mountVantaPlayer({
          root: ctx.playerMount,
          itemId,
          title: item.Name || item.SeriesName || '',
          poster: getPosterUrl(item),
          resumePosition: (positionMs || 0) / 1000,
          resolvePlayback: (mode, options) => MediaApi.getPlayback(itemId, mode, options),
          reportPlayback: (event, payload, options) => MediaApi.reportPlayback(event, payload, options),
          onBack: ctx.goHome,
          watchParty: ctx.watchPartyConfig,
          deferInitialLoad,
          episodeBrowser: episodeContext ? {
            enabled: true,
            context: episodeContext,
            readonly: !ctx.isPartyAdmin(),
            onSelectEpisode: episode => {
              if (!ctx.isPartyAdmin()) return;
              ctx.socket?.sendJson({ type: 'OWNER_CHANGE_EPISODE', itemId: episode.Id, positionMs: 0 });
            },
            onNextEpisode: ({ episode }) => {
              if (!ctx.isPartyAdmin()) return;
              ctx.socket?.sendJson({ type: 'OWNER_CHANGE_EPISODE', itemId: episode.Id, positionMs: 0 });
            }
          } : null
        });

        if (ctx.destroyed) {
          ctx.controller?.destroy();
          ctx.controller = null;
          return;
        }

        ctx.maybeStartOwnerHeartbeat();
        if (phase === 'ready-room') ctx.renderReadyOverlay();
      } catch (error) {
        console.error('[Watch Party Player Error]', error);
        if (!ctx.destroyed) appStore.showToast('Player konnte nicht gestartet werden', 'error');
      }
    })();

    try {
      await ctx.mountInFlight;
    } finally {
      ctx.mountInFlight = null;
    }
  };

  ctx.ensurePlayerPlayback = async () => {
    if (ctx.controller) {
      ctx.showPlayerSurface();
      ctx.setPlaybackPhase();
      return;
    }
    await ctx.mountPlayer({
      itemId: ctx.party.playableItemId,
      positionMs: ctx.party.positionMs,
      phase: 'playback',
      deferInitialLoad: true
    });
    ctx.setPlaybackPhase();
  };

  ctx.replacePlayer = async ({ itemId, positionMs }) => {
    ctx.stopOwnerHeartbeat();
    ctx.leavePlayback();
    ctx.resetPreload();
    try {
      // Await so the server releases the old stream-limit slot before the new
      // episode's playback is reserved (otherwise it can briefly hit the stream limit).
      await ctx.controller?.destroy();
    } catch (error) {
      console.warn('[Watch Party Replace Cleanup]', error);
    }
    ctx.controller = null;
    ctx.playerMount.innerHTML = '';
    await ctx.mountPlayer({ itemId, positionMs, force: true });
    await ctx.enterPlayback();
  };

  return ctx;
}
