import { MediaApi } from '../../api/media.api.js';
import { appStore } from '../../store/app.store.js';
import { loadEpisodeContext } from '../../utils/episodeContext.js';
import { PLAYER_MODULE_URL, playerMediaOptions } from '../../utils/playerMedia.js';

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
          canControl: ctx.isPartyAdmin(),
          currentUserId: ctx.currentUser?.id,
          participants: ctx.party.members,
          disableQualityMenu: true,
          getSyncStatus: () => ({
            kind: ctx.syncStatusBadge.dataset.status,
            label: ctx.syncStatusBadge.textContent
          }),
          onResync: () => ctx.drift.resync(),
          isNextEpisodeCancelled: () => Boolean(ctx.party?.nextEpisodeCancelledFor)
            && ctx.party.nextEpisodeCancelledFor === ctx.party.playableItemId,
          isHost: ctx.isOwner(),
          waitForBuffering: ctx.party.waitForBuffering !== false,
          onSetWaitForBuffering: enabled => ctx.socket?.sendJson({ type: 'OWNER_SET_WAIT_FOR_BUFFERING', enabled: Boolean(enabled) }),
          onOwnerPlay: ownerPositionMs => ctx.sendOwnerControl('OWNER_PLAY', ownerPositionMs),
          onOwnerPause: ownerPositionMs => ctx.sendOwnerControl('OWNER_PAUSE', ownerPositionMs),
          onOwnerSeek: (ownerPositionMs, { step } = {}) => ctx.sendOwnerControl('OWNER_SEEK', ownerPositionMs, step ? { step } : {}),
          onPromoteMember: targetUserId => ctx.socket?.sendJson({ type: 'ADMIN_PROMOTE_MEMBER', targetUserId }),
          onDemoteMember: targetUserId => ctx.socket?.sendJson({ type: 'ADMIN_DEMOTE_MEMBER', targetUserId }),
          onBanMember: targetUserId => ctx.socket?.sendJson({ type: 'ADMIN_BAN_MEMBER', targetUserId })
        };

        ctx.controller = await playerModule.mountVantaPlayer({
          root: ctx.playerMount,
          ...playerMediaOptions(item, itemId, { leave: ctx.goHome }),
          resumePosition: (positionMs || 0) / 1000,
          onBack: ctx.goHome,
          watchParty: ctx.watchPartyConfig,
          deferInitialLoad,
          // Party sessions start from the defaults and remember choices only
          // for this party (see preferences.js in the player).
          preferences: { key: `vanta.player.party.${ctx.partyId}`, storage: 'session' },
          episodeBrowser: episodeContext ? {
            enabled: true,
            context: episodeContext,
            readonly: !ctx.isPartyAdmin(),
            onSelectEpisode: episode => {
              if (!ctx.isPartyAdmin()) return;
              ctx.socket?.sendJson({ type: 'OWNER_CHANGE_EPISODE', itemId: episode.Id, positionMs: 0 });
            },
            // Everyone sees the same prompt; when it runs out, every admin
            // asks for the switch and the server carries it out once.
            onNextEpisode: ({ episode }) => {
              if (!ctx.isPartyAdmin()) return;
              ctx.socket?.sendJson({ type: 'OWNER_CHANGE_EPISODE', itemId: episode.Id, positionMs: 0 });
            },
            onDismissNextEpisode: () => {
              if (ctx.isPartyAdmin()) ctx.socket?.sendJson({ type: 'NEXT_EPISODE_CANCEL' });
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

  // Next episode in the party: the new player loads right away, paused at
  // the start and without a click, and reports ready on its own. The server
  // starts everyone together once all are ready (TIMELINE 'episode-start').
  ctx.switchEpisode = async ({ itemId }) => {
    if (!itemId || ctx.switchingItemId === itemId) return;
    ctx.switchingItemId = itemId;
    ctx.cancelSyncedStart();
    ctx.localPlaybackStarted = false;
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
    await ctx.mountPlayer({ itemId, positionMs: 0, force: true, deferInitialLoad: true });
    if (ctx.destroyed || ctx.switchingItemId !== itemId || ctx.party?.status !== 'switching') return;
    ctx.readyRequested = true;
    await ctx.startPreload();
  };

  return ctx;
}
