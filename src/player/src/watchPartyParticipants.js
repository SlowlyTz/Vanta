import {
  CLOSE_PLAYER_MENUS_EVENT,
  requestClosePlayerMenus,
  shouldCloseForMenuRequest,
  stopPlayerMenuClick,
  stopPlayerMenuPointerEvent
} from './menuEvents.js';

const USERS_ICON = '<path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5 1.34 3.5 3 3.5zM8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11zm0 2c-2.67 0-5 1.34-5 3v2h10v-2c0-1.66-2.33-3-5-3zm8 0c-.31 0-.62.02-.91.06 1.18.84 1.91 1.95 1.91 3.19V18h4v-2c0-1.66-2.33-3-5-3z"/>';

function svgIcon(path) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function roleLabel(role) {
  if (role === 'owner') return 'Owner';
  if (role === 'admin') return 'Admin';
  return '';
}

export function canPromote({ viewerRole, member, currentUserId }) {
  return ['owner', 'admin'].includes(viewerRole)
    && member.userId !== currentUserId
    && member.role === 'viewer';
}

export function canBan({ viewerRole, member, currentUserId }) {
  if (!['owner', 'admin'].includes(viewerRole)) return false;
  if (member.userId === currentUserId) return false;
  if (member.role === 'owner') return false;
  if (member.role === 'admin' && viewerRole !== 'owner') return false;
  return true;
}

export function createWatchPartyParticipantsMenu({
  buttonContainer,
  menuContainer = buttonContainer,
  watchParty
}) {
  let isOpen = false;
  let pendingBanUserId = null;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vanta-player-menu-button vanta-player-participants-button';
  button.setAttribute('aria-label', 'Teilnehmer');
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = `${svgIcon(USERS_ICON)}<span class="vanta-player-participants-count">0</span>`;

  const menu = document.createElement('div');
  menu.className = 'vanta-player-menu vanta-player-participants-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Teilnehmer verwalten');
  menu.hidden = true;

  buttonContainer.insertBefore(button, buttonContainer.firstChild);
  menuContainer.appendChild(menu);

  const getViewerRole = () => {
    const current = watchParty.participants?.find(member => member.userId === watchParty.currentUserId);
    return current?.role || 'viewer';
  };

  const render = () => {
    const participants = watchParty.participants || [];
    const viewerRole = getViewerRole();
    button.querySelector('.vanta-player-participants-count').textContent = String(participants.length);

    const participantRows = participants.map(member => {
      const badge = roleLabel(member.role);
      const promote = canPromote({ viewerRole, member, currentUserId: watchParty.currentUserId });
      const ban = canBan({ viewerRole, member, currentUserId: watchParty.currentUserId });
      const confirming = pendingBanUserId === member.userId;
      const actions = [
        promote ? `<button type="button" class="vanta-player-participant-action" data-action="promote" data-user-id="${escapeHtml(member.userId)}">Admin machen</button>` : '',
        ban ? `<button type="button" class="vanta-player-participant-action is-danger" data-action="${confirming ? 'confirm-ban' : 'ban'}" data-user-id="${escapeHtml(member.userId)}">${confirming ? 'Ban bestätigen' : 'Bannen'}</button>` : ''
      ].filter(Boolean).join('');

      return `
        <div class="vanta-player-participant-row" data-user-id="${escapeHtml(member.userId)}">
          <span class="vanta-player-participant-avatar">${escapeHtml((member.username || '?').slice(0, 1).toUpperCase())}</span>
          <span class="vanta-player-participant-details">
            <span class="vanta-player-participant-topline">
              <span class="vanta-player-participant-main">
                <strong>${escapeHtml(member.username || 'Unbekannt')}</strong>
                ${badge ? `<span class="vanta-player-participant-role">${badge}</span>` : ''}
              </span>
              <span class="vanta-player-participant-status ${member.connected ? 'is-connected' : 'is-waiting'}">
                <span class="vanta-player-participant-status-dot" aria-hidden="true"></span>
                ${member.connected ? 'Verbunden' : 'Offline'}
              </span>
            </span>
            ${actions ? `<span class="vanta-player-participant-actions">${actions}</span>` : ''}
          </span>
        </div>`;
    }).join('');

    menu.innerHTML = `
      <div class="vanta-player-participants-header">
        <span>Teilnehmer</span>
        <span>${participants.length}/4</span>
      </div>
      <div class="vanta-player-participants-list">
        ${participantRows || '<div class="vanta-player-menu-empty">Keine Teilnehmer</div>'}
      </div>`;
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    pendingBanUserId = null;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  const open = () => {
    if (isOpen) return;
    requestClosePlayerMenus(menu);
    isOpen = true;
    render();
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  };

  const toggle = () => {
    if (isOpen) close();
    else open();
  };

  const handleButtonClick = event => {
    stopPlayerMenuClick(event);
    toggle();
  };

  const handleMenuClick = event => {
    stopPlayerMenuClick(event);
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) return;

    const targetUserId = actionButton.dataset.userId;
    if (actionButton.dataset.action === 'promote') {
      watchParty.onPromoteMember?.(targetUserId);
      return;
    }

    if (actionButton.dataset.action === 'ban') {
      pendingBanUserId = targetUserId;
      render();
      return;
    }

    if (actionButton.dataset.action === 'confirm-ban') {
      watchParty.onBanMember?.(targetUserId);
      pendingBanUserId = null;
      render();
    }
  };

  const handleCloseRequest = event => {
    if (shouldCloseForMenuRequest(event, menu)) close();
  };

  const handleDocumentClick = event => {
    if (!isOpen) return;
    if (!menu.contains(event.target) && !button.contains(event.target)) {
      close();
    }
  };

  button.addEventListener('click', handleButtonClick);
  button.addEventListener('pointerdown', stopPlayerMenuPointerEvent);
  menu.addEventListener('click', handleMenuClick);
  menu.addEventListener('pointerdown', stopPlayerMenuPointerEvent);
  document.addEventListener(CLOSE_PLAYER_MENUS_EVENT, handleCloseRequest);
  document.addEventListener('click', handleDocumentClick);

  const previousParticipantsChange = watchParty.onParticipantsChange;
  const handleParticipantsChange = () => {
    previousParticipantsChange?.();
    render();
  };

  watchParty.onParticipantsChange = handleParticipantsChange;

  render();

  return {
    update: render,
    open,
    close,
    destroy: () => {
      close();
      button.removeEventListener('click', handleButtonClick);
      button.removeEventListener('pointerdown', stopPlayerMenuPointerEvent);
      menu.removeEventListener('click', handleMenuClick);
      menu.removeEventListener('pointerdown', stopPlayerMenuPointerEvent);
      document.removeEventListener(CLOSE_PLAYER_MENUS_EVENT, handleCloseRequest);
      document.removeEventListener('click', handleDocumentClick);
      if (watchParty.onParticipantsChange === handleParticipantsChange) {
        watchParty.onParticipantsChange = previousParticipantsChange;
      }
      button.remove();
      menu.remove();
    }
  };
}
