import { WatchPartyApi } from '../../api/watch-party.api.js';
import { createWatchPartySocket } from '../../realtime/watch-party.socket.js';
import { appStore } from '../../store/app.store.js';
import { PLAYBACK_STATUSES } from './helpers.js';
import { timelineFromParty } from './sync.js';

export function bindSocketHandlers(ctx) {
  ctx.handleSocketMessage = message => {
    if (!message?.type || ctx.destroyed) return;

    switch (message.type) {
      case 'TIME_PONG':
        ctx.clock.handlePong(message);
        return;

      case 'PARTY_STATE':
      case 'PARTY_UPDATED':
        ctx.applyPartySnapshot(message.party);
        return;

      case 'COUNTDOWN':
        ctx.enterCountdown({
          startsAtServerTimeMs: message.startsAtServerTimeMs,
          durationMs: message.durationMs,
          positionMs: message.positionMs ?? ctx.party?.positionMs,
          timeline: message.timeline
        });
        return;

      case 'LOAD_MEDIA':
        if (message.reason === 'episode-change') {
          appStore.showToast(message.message || 'Folge gewechselt', 'success');
          ctx.replacePlayer({ itemId: message.itemId, positionMs: message.positionMs });
        } else {
          ctx.mountPlayer({ itemId: message.itemId, positionMs: message.positionMs });
        }
        return;

      case 'TIMELINE':
        ctx.handleTimelineMessage(message);
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

  // Every full party payload (join, reconnect, updates) goes through here: it
  // refreshes the lobby and moves the page into the phase the party is in.
  ctx.applyPartySnapshot = party => {
    ctx.party = party;
    ctx.acceptTimeline(timelineFromParty(party));
    ctx.renderParty();
    if (party.status === 'ready-room') {
      ctx.ensurePlayerReadyRoom();
      ctx.renderReadyOverlay();
    } else if (party.status === 'countdown') {
      const timeline = timelineFromParty(party);
      ctx.enterCountdown({ startsAtServerTimeMs: timeline.anchorServerTimeMs, positionMs: timeline.positionMs });
    } else if (PLAYBACK_STATUSES.has(party.status)) {
      // The server flips to playing at the same instant this client starts
      // on its own; until then the scheduled start owns the handover.
      if (ctx.scheduledStartAt && ctx.clock.now() < ctx.scheduledStartAt) return;
      void ctx.enterPlayback();
    }
  };

  ctx.enterCountdown = ({ startsAtServerTimeMs, durationMs = 5000, positionMs, timeline }) => {
    if (ctx.localPlaybackStarted) return;
    if (ctx.party) ctx.party.status = 'countdown';
    if (timeline && ctx.acceptTimeline(timeline)) {
      ctx.lastAppliedTimelineSeq = Math.max(ctx.lastAppliedTimelineSeq, timeline.seq);
      if (ctx.party) ctx.party.timeline = timeline;
    }

    const alreadyCounting = ctx.scheduledStartAt === Number(startsAtServerTimeMs) && !ctx.countdownOverlay.hidden;
    if (!alreadyCounting) {
      void ctx.ensurePlayerReadyRoom();
      ctx.showCountdown({ startsAtServerTimeMs, durationMs, positionMs });
      ctx.scheduleSyncedStart(startsAtServerTimeMs);
    }
    ctx.renderReadyOverlay();
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

      ctx.socket = createWatchPartySocket({
        partyId: ctx.partyId,
        onMessage: ctx.handleSocketMessage,
        onOpen: () => ctx.clock.start(),
        onReconnecting: () => ctx.setSyncStatus('lost', 'Verbindung verloren. Reconnect läuft …')
      });

      ctx.applyPartySnapshot(joined);
    } catch (error) {
      if (!ctx.destroyed) ctx.renderError(error);
    }
  };

  return ctx;
}
