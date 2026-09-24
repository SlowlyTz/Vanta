import { createElement } from '../../utils/dom.js';
import { authStore } from '../../store/auth.store.js';
import { createServerClock, readSkewFromLocation } from '../../realtime/serverClock.js';
import { createTopbar } from './lobby/topbar.js';
import { createLobbyHero } from './lobby/hero.js';
import { createRoster } from './lobby/roster.js';
import { createInviteBar } from './lobby/inviteBar.js';
import { createActionBar } from './lobby/actionBar.js';

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
    watchPartyConfig: null,
    lastAutoSyncNotificationAt: 0,
    destroyed: false,
    scrollLockY: 0,
    ending: false,
    selectedInviteUser: null,
    sendingInvitation: false,
    inviteResolveTimer: null,
    syncInfo: null,
    playbackEntered: false,
    playbackEntering: null,
    scheduledStartAt: null,
    syncedStartTimer: null,
    localPlaybackStarted: false,
    timeline: null,
    lastAppliedTimelineSeq: -1,
    mountInFlight: null
  };

  ctx.clock = createServerClock({
    send: payload => ctx.socket?.sendJson(payload),
    skewMs: readSkewFromLocation()
  });

  ctx.isOwner = () => Boolean(ctx.party && ctx.currentUser && ctx.party.ownerUserId === ctx.currentUser.id);

  ctx.currentMember = () => ctx.party?.members?.find(member => member.userId === ctx.currentUser?.id) || null;

  ctx.isPartyAdmin = () => {
    const role = ctx.currentMember()?.role;
    return role === 'owner' || role === 'admin';
  };

  // --- DOM ---
  ctx.topbar = createTopbar(ctx);
  ctx.backButton = ctx.topbar.backButton;
  ctx.endButton = ctx.topbar.endButton;

  // Kept off-screen: the sync state is shown inside the player; the badge
  // only carries the current label for it and for tests.
  ctx.syncStatusBadge = createElement('span', {
    className: 'watch-party-sync-status',
    dataset: { status: 'preparing' }
  }, 'Wird vorbereitet');

  ctx.hero = createLobbyHero();
  ctx.roster = createRoster(ctx);
  ctx.inviteBar = createInviteBar(ctx);
  ctx.inviteInput = ctx.inviteBar.input;
  ctx.inviteUserButton = ctx.inviteBar.userButton;
  ctx.roster.element.appendChild(ctx.inviteBar.element);

  ctx.actionBar = createActionBar(ctx);
  ctx.startButton = ctx.actionBar.startButton;
  ctx.startHint = ctx.actionBar.hint;
  ctx.readyButton = ctx.actionBar.readyButton;
  ctx.readyStatus = ctx.actionBar.status;

  ctx.lobby = createElement('div', { className: 'watch-party-lobby', dataset: { phase: 'waiting' } },
    ctx.hero.backdrop,
    createElement('div', { className: 'watch-party-lobby-inner' },
      ctx.hero.element,
      ctx.roster.element
    ),
    ctx.actionBar.element
  );

  ctx.playerMount = createElement('div', { className: 'watch-party-player-mount' });

  // Countdown: the three.js scene draws into the stage; the fallback digit
  // shows until the scene is up, or instead of it without WebGL or with
  // reduced motion.
  ctx.countdownStage = createElement('div', { className: 'watch-party-countdown-stage', 'aria-hidden': 'true' });
  ctx.countdownNumber = createElement('span', { className: 'watch-party-countdown-number', 'aria-hidden': 'true' });
  const countdownFallback = createElement('div', { className: 'watch-party-countdown-fallback' }, ctx.countdownNumber);

  ctx.countdownTitle = createElement('div', { className: 'watch-party-countdown-title' });
  ctx.countdownMeta = createElement('div', { className: 'watch-party-countdown-meta' });
  ctx.countdownPosition = createElement('div', { className: 'watch-party-countdown-position' });
  ctx.countdownLive = createElement('span', { className: 'watch-party-countdown-live', role: 'status', 'aria-live': 'polite' });
  const countdownInfo = createElement('div', { className: 'watch-party-countdown-info' },
    ctx.countdownTitle, ctx.countdownMeta, ctx.countdownPosition
  );
  ctx.countdownOverlay = createElement('div', { className: 'watch-party-countdown-overlay', hidden: true },
    ctx.countdownStage, countdownFallback, countdownInfo, ctx.countdownLive
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

  // "Waiting for …" while the party pauses for a buffering member.
  ctx.waitingTitle = createElement('strong', { className: 'watch-party-waiting-title' });
  ctx.waitingHint = createElement('span', { className: 'watch-party-waiting-hint' });
  ctx.waitingPill = createElement('div', { className: 'watch-party-waiting', role: 'status', 'aria-live': 'polite', hidden: true },
    createElement('span', { className: 'watch-party-waiting-spinner', 'aria-hidden': 'true' }),
    createElement('span', { className: 'watch-party-waiting-text' }, ctx.waitingTitle, ctx.waitingHint)
  );

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

  container.appendChild(ctx.topbar.element);
  container.appendChild(ctx.lobby);
  container.appendChild(ctx.inviteUserOverlay);
  container.appendChild(ctx.countdownOverlay);
  container.appendChild(ctx.autoplayOverlay);
  container.appendChild(ctx.endedState);
  container.appendChild(ctx.errorState);
  container.appendChild(ctx.waitingPill);
  container.appendChild(ctx.notificationStack);

  return ctx;
}
