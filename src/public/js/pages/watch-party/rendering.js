import { createElement } from '../../utils/dom.js';
import { connectedMemberCount } from './helpers.js';

function stateCard({ title, message, onHome }) {
  return createElement('div', { className: 'watch-party-state-card' },
    createElement('h2', {}, title),
    createElement('p', {}, message),
    createElement('button', {
      className: 'watch-party-primary-button',
      type: 'button',
      onClick: onHome
    }, 'Zurück zur Startseite')
  );
}

export function bindRendering(ctx) {
  ctx.renderHero = () => {
    ctx.hero.render({
      snapshot: ctx.party.itemSnapshot || {},
      ownerName: ctx.party.ownerName,
      positionMs: ctx.party.timeline?.positionMs ?? ctx.party.positionMs
    });
  };

  ctx.renderMembers = () => ctx.roster.render();

  // The action bar follows the party phase: the host starts from the waiting
  // lobby, then everyone gets ready in the same place.
  ctx.renderActions = () => {
    const { title, hint, status, startButton, readyButton, waitingDots } = ctx.actionBar;
    const party = ctx.party;
    const owner = ctx.isOwner();

    ctx.topbar.setOwnerControls(owner && party.status !== 'ended');
    ctx.inviteUserButton.hidden = !owner || party.status !== 'lobby';

    startButton.hidden = true;
    readyButton.hidden = true;
    waitingDots.hidden = true;
    hint.textContent = '';
    status.textContent = '';

    if (party.status === 'lobby') {
      ctx.lobby.dataset.phase = 'waiting';
      const connected = connectedMemberCount(party.members);
      if (owner) {
        title.textContent = 'Alle da?';
        hint.textContent = connected > 1
          ? `${connected} verbunden – starte, sobald alle da sind.`
          : 'Du kannst auch allein starten.';
        startButton.hidden = false;
        startButton.disabled = false;
      } else {
        title.textContent = 'Gleich geht’s los';
        hint.textContent = `Warte, bis ${party.ownerName || 'der Gastgeber'} die Party startet.`;
        waitingDots.hidden = false;
      }
      return;
    }

    ctx.lobby.dataset.phase = party.status === 'countdown' ? 'countdown' : 'ready';
    ctx.renderReadyState();
  };

  ctx.renderParty = () => {
    if (!ctx.party) return;
    ctx.renderHero();
    ctx.renderMembers();
    ctx.renderActions();
    ctx.syncWatchPartyConfig();
  };

  ctx.syncWatchPartyConfig = () => {
    if (!ctx.watchPartyConfig || !ctx.party) return;

    const canControl = ctx.isPartyAdmin();
    ctx.watchPartyConfig.isOwner = canControl;
    ctx.watchPartyConfig.canControl = canControl;
    ctx.watchPartyConfig.participants = ctx.party.members;
    ctx.watchPartyConfig.currentUserId = ctx.currentUser?.id;
    ctx.controller?.updateWatchPartyAccess?.({
      isOwner: canControl,
      canControl,
      participants: ctx.party.members,
      currentUserId: ctx.currentUser?.id
    });
    ctx.watchPartyConfig.onParticipantsChange?.();
    ctx.maybeStartOwnerHeartbeat();
  };

  ctx.renderError = error => {
    console.error('[Watch Party Init Error]', error);
    ctx.lobby.hidden = true;
    ctx.errorState.hidden = false;
    ctx.errorState.innerHTML = '';
    ctx.errorState.appendChild(stateCard({
      title: 'Watch Party nicht verfügbar',
      message: error.message || 'Diese Watch Party konnte nicht geladen werden.',
      onHome: () => ctx.goHome()
    }));
  };

  ctx.showEndedState = message => {
    ctx.stopOwnerHeartbeat();
    ctx.leavePlayback();
    try {
      ctx.controller?.destroy();
    } catch (error) {
      console.warn('[Watch Party Ended Cleanup]', error);
    }
    ctx.controller = null;
    ctx.unlockPlayerViewport();
    ctx.playerMount.remove();
    ctx.hideCountdown();
    ctx.autoplayOverlay.hidden = true;
    ctx.lobby.hidden = true;
    ctx.topbar.setOwnerControls(false);

    ctx.endedState.hidden = false;
    ctx.endedState.innerHTML = '';
    ctx.endedState.appendChild(stateCard({
      title: 'Watch Party beendet',
      message: message || 'Die Watch Party wurde beendet.',
      onHome: () => ctx.goHome()
    }));
  };

  return ctx;
}
