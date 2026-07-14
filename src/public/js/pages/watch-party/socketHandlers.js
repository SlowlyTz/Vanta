import { WatchPartyApi } from '../../api/watch-party.api.js';
import { createWatchPartySocket } from '../../realtime/watch-party.socket.js';
import { appStore } from '../../store/app.store.js';
import { shouldShowPlayerForParty, PLAYBACK_STATUSES } from './helpers.js';

export function bindSocketHandlers(ctx) {
  ctx.handleSocketMessage = message => {
    if (!message?.type || ctx.destroyed) return;

    switch (message.type) {
      case 'PARTY_STATE': {
        ctx.party = message.party;
        ctx.renderParty();
        if (ctx.party.status === 'ready-room' || ctx.party.status === 'countdown') {
          ctx.ensurePlayerReadyRoom();
        } else if (PLAYBACK_STATUSES.has(ctx.party.status)) {
          void ctx.enterLivePlayback({
            positionMs: message.effectivePositionMs ?? ctx.party.positionMs,
            serverTimeMs: message.serverTimeMs,
            playing: ctx.party.status === 'playing'
          });
        }
        return;
      }

      case 'PARTY_UPDATED':
        const previousStatus = ctx.party?.status;
        ctx.party = message.party;
        ctx.renderParty();
        if (ctx.party.status === 'ready-room' || ctx.party.status === 'countdown') {
          ctx.ensurePlayerReadyRoom();
          ctx.renderReadyOverlay();
        } else if (ctx.party.status === 'playing' && previousStatus === 'countdown') {
          void ctx.handleControlPlay({
            action: 'play',
            positionMs: ctx.party.positionMs,
            serverTimeMs: ctx.party.lastServerTimeMs || Date.now(),
            playing: true
          });
        } else if (shouldShowPlayerForParty(ctx.party)) {
          if (ctx.controller) {
            ctx.showPlayerSurface();
            ctx.setPlaybackPhase();
            ctx.maybeStartOwnerHeartbeat();
          } else if (ctx.party.playableItemId) {
            ctx.mountPlayer({
              itemId: ctx.party.playableItemId,
              positionMs: ctx.party.positionMs,
              phase: 'playback'
            });
          }
        }
        return;

      case 'COUNTDOWN':
        if (ctx.party) ctx.party.status = 'countdown';
        ctx.ensurePlayerReadyRoom();
        ctx.showCountdown({
          startsAtServerTimeMs: message.startsAtServerTimeMs,
          positionMs: message.positionMs ?? ctx.party?.positionMs
        });
        ctx.renderReadyOverlay();
        return;

      case 'LOAD_MEDIA':
        if (message.reason === 'episode-change') {
          appStore.showToast(message.message || 'Folge gewechselt', 'success');
          ctx.replacePlayer({ itemId: message.itemId, positionMs: message.positionMs });
        } else {
          ctx.mountPlayer({ itemId: message.itemId, positionMs: message.positionMs });
        }
        return;

      case 'CONTROL': {
        const payload = {
          action: message.action,
          positionMs: message.positionMs,
          serverTimeMs: message.serverTimeMs,
          playing: message.action === 'play' || Boolean(message.playing)
        };

        if (message.action === 'play') {
          void ctx.handleControlPlay(payload);
          return;
        }

        ctx.safeApplyRemoteControl(payload);
        return;
      }

      case 'SYNC':
        ctx.applySync(message);
        return;

      case 'NOTIFICATION':
        ctx.showWatchPartyNotification(message.notification || {});
        return;

      case 'PARTY_ENDED':
        ctx.party = message.party || ctx.party;
        ctx.showEndedState(message.message);
        return;

      case 'KICKED':
        try {
          ctx.controller?.destroy();
        } catch (error) {
          console.warn('[Watch Party Kicked Cleanup]', error);
        }
        appStore.showToast('Du wurdest aus der Watch Party entfernt.', 'error');
        window.location.hash = '#/home';
        return;

      case 'BANNED_FROM_PARTY':
        try {
          ctx.controller?.destroy();
        } catch (error) {
          console.warn('[Watch Party Banned Cleanup]', error);
        }
        appStore.showToast(message.message || 'Du wurdest aus der Watch Party ausgeschlossen.', 'error');
        window.location.hash = '#/home';
        return;

      case 'ERROR':
        appStore.showToast(message.message || 'Ein Fehler ist aufgetreten', 'error');
        return;

      default:
        return;
    }
  };

  ctx.init = async () => {
    try {
      const { party: joined } = await WatchPartyApi.join(ctx.partyId);
      if (ctx.destroyed) return;

      ctx.party = joined;
      ctx.inviteInput.value = `${window.location.origin}/#/watch-party/${ctx.partyId}`;

      if (ctx.party.status === 'ended') {
        ctx.showEndedState('Diese Watch Party wurde bereits beendet.');
        return;
      }

      ctx.renderParty();

      ctx.socket = createWatchPartySocket({
        partyId: ctx.partyId,
        onMessage: ctx.handleSocketMessage,
        onReconnecting: () => ctx.setSyncStatus('lost', 'Verbindung verloren. Reconnect läuft …')
      });

      if (ctx.party.status === 'ready-room' || ctx.party.status === 'countdown') {
        ctx.ensurePlayerReadyRoom();
      } else if (PLAYBACK_STATUSES.has(ctx.party.status)) {
        void ctx.enterLivePlayback({
          positionMs: ctx.party.positionMs,
          serverTimeMs: ctx.party.lastServerTimeMs,
          playing: ctx.party.status === 'playing'
        });
      }
    } catch (error) {
      if (!ctx.destroyed) ctx.renderError(error);
    }
  };

  return ctx;
}
