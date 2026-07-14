import { createElement } from '../../utils/dom.js';
import { YouTubePlayerManager } from './player.js';
import { createScrollerViewportLock } from './viewport.js';
import { createInitialState } from '../trailer-scroller.state.js';

let scrollerInstanceCounter = 0;

const SCROLLER_ICONS = {
  previous: '<path d="m18 15-6-6-6 6"></path>',
  next: '<path d="m6 9 6 6 6-6"></path>',
  favorite: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path>',
  details: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path>',
  share: '<circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="m8.2 10.8 7.6-4.5"></path><path d="m8.2 13.2 7.6 4.5"></path>',
  film: '<rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="m10 9 5 3-5 3Z"></path>',
  retry: '<path d="M20 6v5h-5"></path><path d="M4 18v-5h5"></path><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8"></path><path d="M5.5 15A7 7 0 0 0 17.8 17.8L20 16"></path>'
};

export function createScrollerIcon(name, className = 'trailer-ui-icon') {
  const icon = createElement('span', { className, 'aria-hidden': 'true' });
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      ${SCROLLER_ICONS[name] || ''}
    </svg>
  `;
  return icon;
}

export function createTrailerScrollerContext() {
  const instanceId = ++scrollerInstanceCounter;
  const container = createElement('div', { className: 'trailer-scroller-page' });
  const viewportLock = createScrollerViewportLock();

  const ctx = {
    instanceId,
    container,
    viewportLock,
    playerManager: new YouTubePlayerManager(),
    state: createInitialState(),
    cleanupFns: [],
    syncPlayersTimeout: null,
    syncPlayersRunId: 0,
    navigationUnlockTimeout: null,
    isDestroyed: false,
    shareModal: null,
    suppressIntersectionUpdates: true,
    lastLoadFailed: false,
    expandedOverviewIds: new Set()
  };

  ctx.onCleanup = fn => {
    ctx.cleanupFns.push(fn);
  };

  ctx.cleanup = () => {
    ctx.isDestroyed = true;
    ctx.playerManager.destroyAll();
    ctx.closeShareModal();
    ctx.cleanupFns.forEach(fn => fn());
    ctx.cleanupFns = [];
    if (ctx.syncPlayersTimeout) {
      clearTimeout(ctx.syncPlayersTimeout);
      ctx.syncPlayersTimeout = null;
    }
    if (ctx.navigationUnlockTimeout) {
      clearTimeout(ctx.navigationUnlockTimeout);
      ctx.navigationUnlockTimeout = null;
    }
    ctx.syncPlayersRunId += 1;
    ctx.viewportLock.unlock();
  };

  ctx.getContainerId = index => `trailer-player-${instanceId}-${index}`;

  ctx.previousButton = createElement('button', {
    className: 'trailer-nav-button trailer-nav-previous',
    type: 'button',
    disabled: true,
    title: 'Vorheriger Trailer (Pfeil hoch)',
    'aria-label': 'Vorheriger Trailer',
    onClick: () => ctx.navigateRelative(-1)
  }, createScrollerIcon('previous'));

  ctx.nextButton = createElement('button', {
    className: 'trailer-nav-button trailer-nav-next',
    type: 'button',
    disabled: true,
    title: 'Nächster Trailer (Pfeil runter)',
    'aria-label': 'Nächster Trailer',
    onClick: () => ctx.navigateRelative(1)
  }, createScrollerIcon('next'));

  const header = createElement('header', { className: 'trailer-scroller-header' },
    createElement('div', { className: 'trailer-scroller-heading' },
      createElement('span', { className: 'trailer-scroller-eyebrow' }, 'VANTA Auswahl'),
      createElement('h1', { className: 'trailer-scroller-title' }, 'Trailer entdecken')
    ),
    createElement('p', { className: 'trailer-scroller-hint' },
      createElement('span', { className: 'trailer-hint-key', 'aria-hidden': 'true' }, '↑'),
      createElement('span', { className: 'trailer-hint-key', 'aria-hidden': 'true' }, '↓'),
      createElement('span', {}, 'scrollen · YouTube steuert die Wiedergabe')
    ),
    createElement('div', { className: 'trailer-scroller-navigation' },
      ctx.previousButton,
      ctx.nextButton
    )
  );

  ctx.track = createElement('div', { className: 'trailer-scroller-track' });
  container.appendChild(header);
  container.appendChild(ctx.track);

  return ctx;
}
