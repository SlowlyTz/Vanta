import { createElement } from '../../utils/dom.js';
import { memberInitial } from './helpers.js';

function readyStateLabel(member) {
  if (member.ready || member.preloadState === 'ready') return 'Bereit';
  if (member.preloadState === 'preparing') return 'Wird vorbereitet …';
  if (member.preloadState === 'error') return member.preloadMessage || 'Fehler';
  return 'Wartet';
}

function readyStateClass(member) {
  if (member.ready || member.preloadState === 'ready') return 'is-ready';
  if (member.preloadState === 'preparing') return 'is-preparing';
  if (member.preloadState === 'error') return 'is-error';
  return 'is-idle';
}

export function bindReadyRoom(ctx) {
  ctx.renderReadyOverlay = () => {
    if (!ctx.party) return;
    ctx.readyMembersList.innerHTML = '';
    const self = ctx.party.members.find(member => member.userId === ctx.currentUser?.id);

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
    const selfReady = Boolean(self?.ready);
    const selfPreparing = ctx.localReadyPreparing || self?.preloadState === 'preparing';
    ctx.readyButton.hidden = ctx.party.status !== 'ready-room';
    ctx.readyButton.disabled = selfReady || selfPreparing || ctx.party.status !== 'ready-room';
    ctx.readyButton.textContent = selfReady ? 'Bereit' : (selfPreparing ? 'Wird bestätigt …' : 'Bereit');
    ctx.readyStatus.textContent = allReady
      ? 'Alle sind bereit. Countdown startet gleich.'
      : 'Warte, bis alle Teilnehmer bereit sind.';

    if (ctx.party.status === 'countdown') {
      ctx.readyStatus.textContent = 'Alle sind bereit. Countdown läuft.';
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

  ctx.handleReadyClick = async () => {
    if (ctx.localReadyPreparing || ctx.party?.status !== 'ready-room') return;
    ctx.localReadyPreparing = true;
    ctx.renderReadyOverlay();

    try {
      await ctx.ensurePlayerReadyRoom();
      ctx.socket?.sendJson({ type: 'PLAYER_READY' });
    } catch (error) {
      ctx.socket?.sendJson({
        type: 'PLAYER_READY_STATE',
        state: 'error',
        message: error.message || 'Player-Raum konnte nicht geöffnet werden'
      });
    } finally {
      ctx.localReadyPreparing = false;
      ctx.renderReadyOverlay();
    }
  };

  ctx.ensurePlayerReadyRoom = async () => {
    if (ctx.controller) {
      ctx.showReadyRoom();
      if (ctx.watchPartyConfig) ctx.watchPartyConfig.phase = 'ready-room';
      return;
    }
    await ctx.mountPlayer({
      itemId: ctx.party.playableItemId,
      positionMs: ctx.party.positionMs,
      phase: 'ready-room',
      deferInitialLoad: true
    });
  };

  return ctx;
}
