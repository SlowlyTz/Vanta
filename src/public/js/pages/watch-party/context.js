import { createElement } from '../../utils/dom.js';
import { authStore } from '../../store/auth.store.js';

export function createWatchPartyContext({ partyId }) {
  const container = createElement('div', { className: 'watch-party-page' });

  const ctx = {
    partyId,
    container,
    currentUser: authStore.getState().user,
    party: null,
    socket: null,
    controller: null,
    ownerHeartbeatTimer: null,
    countdownTimer: null,
    watchPartyConfig: null,
    localReadyPreparing: false,
    lastPlayStartServerTimeMs: null,
    lastLiveJoinKey: null,
    lastAutoSyncNotificationAt: 0,
    destroyed: false,
    scrollLockY: 0,
    ending: false,
    selectedInviteUser: null,
    sendingInvitation: false,
    inviteResolveTimer: null,
    blockedPlayPayload: null,
    mountInFlight: null
  };

  ctx.isOwner = () => Boolean(ctx.party && ctx.currentUser && ctx.party.ownerUserId === ctx.currentUser.id);

  ctx.currentMember = () => ctx.party?.members?.find(member => member.userId === ctx.currentUser?.id) || null;

  ctx.isPartyAdmin = () => {
    const role = ctx.currentMember()?.role;
    return role === 'owner' || role === 'admin';
  };

  // --- DOM ---
  ctx.backButton = createElement('button', {
    className: 'watch-party-back',
    type: 'button',
    onClick: () => ctx.goHome()
  }, '← Zurück');

  ctx.syncStatusBadge = createElement('span', {
    className: 'watch-party-sync-status',
    dataset: { status: 'preparing' }
  }, 'Wird vorbereitet');

  ctx.endButton = createElement('button', {
    className: 'watch-party-end-button',
    type: 'button',
    hidden: true,
    onClick: () => ctx.handleEnd()
  }, 'Party beenden');

  const header = createElement('div', { className: 'watch-party-header' },
    ctx.backButton,
    createElement('h1', { className: 'watch-party-title' }, 'Watch Party'),
    ctx.syncStatusBadge,
    ctx.endButton
  );

  ctx.mediaSummary = createElement('div', { className: 'watch-party-media-summary' });

  ctx.inviteInput = createElement('input', {
    className: 'watch-party-invite-input',
    type: 'text',
    readonly: true,
    'aria-label': 'Invite-Link'
  });
  const copyButton = createElement('button', {
    className: 'watch-party-invite-copy',
    type: 'button',
    onClick: () => ctx.handleCopyInvite()
  }, 'Kopieren');
  ctx.inviteUserButton = createElement('button', {
    className: 'watch-party-invite-user',
    type: 'button',
    hidden: true,
    onClick: () => ctx.openInviteUserMenu()
  }, 'User');
  const inviteRow = createElement('div', { className: 'watch-party-invite' }, ctx.inviteInput, copyButton, ctx.inviteUserButton);

  ctx.membersList = createElement('ul', { className: 'watch-party-members' });
  ctx.memberCount = createElement('span', { className: 'watch-party-member-count' });

  ctx.startButton = createElement('button', {
    className: 'watch-party-start-button',
    type: 'button',
    hidden: true,
    onClick: () => ctx.handleStart()
  }, 'Starten');

  ctx.startHint = createElement('div', { className: 'watch-party-start-hint' });

  const sessionSection = createElement('section', { className: 'watch-party-session' },
    createElement('div', { className: 'watch-party-session-kicker' }, 'Watch Party'),
    ctx.mediaSummary
  );
  const inviteSection = createElement('section', { className: 'watch-party-invite-section' },
    createElement('div', { className: 'watch-party-section-label' }, 'Einladen'),
    inviteRow
  );
  const membersSection = createElement('section', { className: 'watch-party-members-section' },
    createElement('div', { className: 'watch-party-section-head' },
      createElement('span', {}, 'Teilnehmer'),
      ctx.memberCount
    ),
    ctx.membersList
  );
  const lobbyFooter = createElement('div', { className: 'watch-party-lobby-footer' }, ctx.startHint, ctx.startButton);
  ctx.lobby = createElement('div', { className: 'watch-party-lobby' },
    createElement('div', { className: 'watch-party-lobby-main' },
      sessionSection,
      inviteSection,
      membersSection,
      lobbyFooter
    )
  );

  ctx.playerMount = createElement('div', { className: 'watch-party-player-mount' });

  ctx.countdownNumber = createElement('div', {
    className: 'watch-party-countdown-number',
    hidden: true,
    'aria-hidden': 'true'
  });
  const countdownGraphic = createElement('div', { className: 'numero_counting_wrapper' },
    createElement('div', { className: 'numero_shape' })
  );
  ctx.countdownTitle = createElement('div', { className: 'watch-party-countdown-title' });
  ctx.countdownMeta = createElement('div', { className: 'watch-party-countdown-meta' });
  ctx.countdownPosition = createElement('div', { className: 'watch-party-countdown-position' });
  const countdownModal = createElement('div', { className: 'watch-party-countdown-modal' },
    countdownGraphic, ctx.countdownNumber, ctx.countdownTitle, ctx.countdownMeta, ctx.countdownPosition
  );
  ctx.countdownOverlay = createElement('div', { className: 'watch-party-countdown-overlay', hidden: true }, countdownModal);

  const readyTitle = createElement('h2', { className: 'watch-party-ready-title' }, 'Bereit zum gemeinsamen Schauen?');
  const readySubtitle = createElement('p', { className: 'watch-party-ready-subtitle' }, 'Jeder Teilnehmer muss einmal Bereit klicken, bevor die Wiedergabe startet.');
  ctx.readyMembersList = createElement('ul', { className: 'watch-party-ready-members' });
  ctx.readyButton = createElement('button', {
    className: 'watch-party-ready-button',
    type: 'button',
    onClick: () => ctx.handleReadyClick()
  }, 'Bereit');
  ctx.readyStatus = createElement('p', { className: 'watch-party-ready-status' });
  ctx.readyOverlay = createElement('div', { className: 'watch-party-ready-overlay', hidden: true },
    createElement('div', { className: 'watch-party-ready-panel' },
      readyTitle,
      readySubtitle,
      ctx.readyMembersList,
      ctx.readyButton,
      ctx.readyStatus
    )
  );

  ctx.autoplayActivateButton = createElement('button', {
    className: 'watch-party-autoplay-button',
    type: 'button'
  }, 'Wiedergabe aktivieren');
  ctx.autoplayOverlay = createElement('div', { className: 'watch-party-autoplay-overlay', hidden: true },
    createElement('p', {}, 'Dein Browser hat die automatische Wiedergabe blockiert.'),
    ctx.autoplayActivateButton
  );

  ctx.endedState = createElement('div', { className: 'watch-party-ended-state', hidden: true });
  ctx.errorState = createElement('div', { className: 'watch-party-error', hidden: true });

  ctx.notificationStack = createElement('div', {
    className: 'watch-party-notifications',
    role: 'status',
    'aria-live': 'polite'
  });

  ctx.inviteUsernameInput = createElement('input', {
    className: 'watch-party-invite-username-input',
    type: 'text',
    'aria-label': 'Username',
    onInput: () => ctx.handleInviteUsernameInput()
  });
  ctx.inviteResult = createElement('div', { className: 'watch-party-invite-result' });
  ctx.inviteStatus = createElement('div', { className: 'watch-party-invite-status' });
  ctx.inviteSendButton = createElement('button', {
    type: 'button',
    className: 'watch-party-invite-send',
    disabled: true,
    onClick: () => ctx.sendSelectedInvitation()
  }, 'Einladung senden');
  const inviteMenuCloseButton = createElement('button', {
    type: 'button',
    className: 'watch-party-invite-menu-close',
    'aria-label': 'Schließen',
    onClick: () => ctx.closeInviteUserMenu()
  }, '×');
  const inviteMenuPanel = createElement('div', {
    className: 'watch-party-invite-menu-panel',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'watch-party-invite-title'
  },
    createElement('div', { className: 'watch-party-invite-menu-header' },
      createElement('h3', { id: 'watch-party-invite-title', className: 'watch-party-invite-menu-title' }, 'User einladen'),
      inviteMenuCloseButton
    ),
    createElement('label', { className: 'watch-party-invite-field' },
      createElement('span', {}, 'Username'),
      ctx.inviteUsernameInput
    ),
    ctx.inviteResult,
    createElement('div', { className: 'watch-party-invite-menu-footer' }, ctx.inviteStatus, ctx.inviteSendButton)
  );
  ctx.inviteUserOverlay = createElement('div', {
    className: 'watch-party-invite-menu-overlay',
    hidden: true,
    onKeydown: event => {
      if (event.key === 'Escape') ctx.closeInviteUserMenu();
    }
  }, inviteMenuPanel);

  container.appendChild(header);
  container.appendChild(ctx.lobby);
  container.appendChild(ctx.inviteUserOverlay);
  container.appendChild(ctx.readyOverlay);
  container.appendChild(ctx.countdownOverlay);
  container.appendChild(ctx.autoplayOverlay);
  container.appendChild(ctx.endedState);
  container.appendChild(ctx.errorState);
  container.appendChild(ctx.notificationStack);

  return ctx;
}
