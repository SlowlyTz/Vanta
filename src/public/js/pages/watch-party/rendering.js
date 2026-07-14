import { createElement } from '../../utils/dom.js';
import { memberInitial, connectedMemberCount } from './helpers.js';

export function bindRendering(ctx) {
  ctx.renderMediaSummary = () => {
    ctx.mediaSummary.innerHTML = '';
    const snapshot = ctx.party.itemSnapshot || {};
    const subtitleParts = [];
    if (snapshot.seriesName) subtitleParts.push(snapshot.seriesName);
    if (snapshot.productionYear) subtitleParts.push(String(snapshot.productionYear));

    ctx.mediaSummary.appendChild(createElement('div', { className: 'watch-party-media-title' }, snapshot.name || 'Unbekanntes Medium'));
    if (subtitleParts.length) {
      ctx.mediaSummary.appendChild(createElement('div', { className: 'watch-party-media-subtitle' }, subtitleParts.join(' · ')));
    }
  };

  ctx.renderMemberRoleBadge = member => {
    if (member.role === 'owner') return createElement('span', { className: 'watch-party-member-badge' }, 'Owner');
    if (member.role === 'admin') return createElement('span', { className: 'watch-party-member-badge is-admin' }, 'Admin');
    return null;
  };

  ctx.renderMembers = () => {
    ctx.membersList.innerHTML = '';
    ctx.memberCount.textContent = `${ctx.party.members.length}/4`;

    ctx.party.members.forEach(member => {
      const isSelf = member.userId === ctx.currentUser?.id;

      const trailing = createElement('span', { className: 'watch-party-member-actions' });

      if (ctx.isOwner() && !isSelf) {
        trailing.appendChild(createElement('button', {
          className: 'watch-party-kick-button',
          type: 'button',
          'aria-label': `${member.username} entfernen`,
          onClick: () => ctx.handleKick(member.userId)
        }, 'Entfernen'));
      }

      trailing.appendChild(createElement('span', {
        className: `watch-party-member-status ${member.connected ? 'is-connected' : 'is-waiting'}`
      },
        createElement('span', { className: 'watch-party-member-status-dot', 'aria-hidden': 'true' }),
        createElement('span', {}, member.connected ? 'Verbunden' : 'Verbindet …')
      ));

      const row = createElement('li', { className: 'watch-party-member' },
        createElement('span', { className: 'watch-party-member-avatar' }, memberInitial(member.username)),
        createElement('span', { className: 'watch-party-member-name' },
          `${member.username}${isSelf ? ' (Du)' : ''}`,
          ctx.renderMemberRoleBadge(member)
        ),
        trailing
      );

      ctx.membersList.appendChild(row);
    });
  };

  ctx.renderActions = () => {
    const owner = ctx.isOwner();
    ctx.startButton.hidden = !owner;
    ctx.endButton.hidden = !owner || ctx.party.status === 'ended';
    ctx.startHint.hidden = !owner;
    ctx.inviteUserButton.hidden = !owner || ctx.party.status === 'ended';

    if (owner) {
      const stillInLobby = ctx.party.status === 'lobby';
      ctx.startButton.textContent = 'Starten';
      ctx.startButton.disabled = !stillInLobby;

      if (!stillInLobby) {
        ctx.startHint.textContent = ctx.party.status === 'ready-room'
          ? 'Warte auf Bereitmeldungen'
          : (ctx.party.status === 'countdown' ? 'Startet …' : 'Party läuft');
      } else {
        const count = connectedMemberCount(ctx.party.members);
        ctx.startHint.textContent = count > 1 ? 'Bereit zum Öffnen des Player-Raums' : 'Du kannst auch alleine starten';
      }
    }
  };

  ctx.renderParty = () => {
    if (!ctx.party) return;
    ctx.renderMediaSummary();
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
  };

  ctx.renderError = error => {
    console.error('[Watch Party Init Error]', error);
    ctx.lobby.hidden = true;
    ctx.errorState.hidden = false;
    ctx.errorState.innerHTML = '';
    ctx.errorState.appendChild(createElement('h2', {}, 'Watch Party nicht verfügbar'));
    ctx.errorState.appendChild(createElement('p', {}, error.message || 'Diese Watch Party konnte nicht geladen werden.'));
    ctx.errorState.appendChild(createElement('button', {
      className: 'btn-primary',
      type: 'button',
      onClick: () => ctx.goHome()
    }, 'Zurück zur Startseite'));
  };

  ctx.showEndedState = message => {
    if (ctx.ownerHeartbeatTimer) {
      window.clearInterval(ctx.ownerHeartbeatTimer);
      ctx.ownerHeartbeatTimer = null;
    }
    try {
      ctx.controller?.destroy();
    } catch (error) {
      console.warn('[Watch Party Ended Cleanup]', error);
    }
    ctx.controller = null;
    ctx.unlockPlayerViewport();
    ctx.playerMount.remove();
    ctx.countdownOverlay.hidden = true;
    ctx.autoplayOverlay.hidden = true;
    ctx.lobby.hidden = true;

    ctx.endedState.hidden = false;
    ctx.endedState.innerHTML = '';
    ctx.endedState.appendChild(createElement('h2', {}, 'Watch Party beendet'));
    ctx.endedState.appendChild(createElement('p', {}, message || 'Die Watch Party wurde beendet.'));
    ctx.endedState.appendChild(createElement('button', {
      className: 'btn-primary',
      type: 'button',
      onClick: () => ctx.goHome()
    }, 'Zurück zur Startseite'));
  };

  return ctx;
}
