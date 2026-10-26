// Top navigation bar: tabs, action icons and the mobile drawer, plus the settings and watch party dialogs it owns.
import { createElement } from '../../utils/dom.js';
import { createMobileDrawer } from './mobileDrawer.js';
import { TOP_TABS, TOP_ACTIONS } from './navLinks.js';
import { createTopbarIcon } from './icons.js';
import { isNavLinkActive } from './activeNav.js';
import { createWatchPartyDialog } from '../watch-party/createWatchPartyDialog.js';
import { createSettingsDialog } from './settingsDialog.js';
import { notificationsStore } from '../../store/notifications.store.js';
import { OPEN_WATCH_PARTY_EVENT } from '../mediaActions.js';
import { createNotificationBell } from '../notificationBell.js';
import { startScreensaver } from '../screensaver.js';
import { getCurrentPageScope } from '../../utils/pageScope.js';
import { followAfterBack, inAppLinkOf } from '../../utils/historyEntry.js';
import { focusableIn } from '../../utils/modal.js';

function createTopTabs({ onNavigate }) {
  const links = new Map();
  const element = createElement('div', {
    className: 'navbar-top-tabs',
    role: 'navigation',
    'aria-label': 'Schnellnavigation'
  });

  TOP_TABS.forEach(tab => {
    const anchor = createElement('a', {
      className: 'navbar-top-tab',
      href: tab.href,
      onClick: () => onNavigate?.()
    }, tab.label);
    links.set(tab.key, anchor);
    element.appendChild(anchor);
  });

  const updateActive = (currentHash) => {
    TOP_TABS.forEach(tab => {
      const anchor = links.get(tab.key);
      const active = isNavLinkActive(tab, currentHash);
      anchor.classList.toggle('active', active);
      if (active) anchor.setAttribute('aria-current', 'page');
      else anchor.removeAttribute('aria-current');
    });
  };

  return { element, updateActive };
}

// Opens the screensaver at once, on any page; leaving the page ends it.
export const startScreensaverNow = () => startScreensaver({ pageScope: getCurrentPageScope() });

const ACTION_HANDLERS = {
  screensaver: () => startScreensaverNow()
};

function createTopActions({ onOpenWatchParty }) {
  const buttons = TOP_ACTIONS.map(action => {
    // Icons only: the name shows on hover.
    const attrs = {
      className: `navbar-action-button navbar-action-${action.key}`,
      'aria-label': action.label,
      title: action.label
    };

    if (action.href) {
      return createElement('a', { ...attrs, href: action.href }, createTopbarIcon(action.key));
    }

    return createElement('button', {
      ...attrs,
      type: 'button',
      onClick: action.key === 'group' ? () => onOpenWatchParty?.() : ACTION_HANDLERS[action.key]
    }, createTopbarIcon(action.key));
  });

  // The bell sits before the profile.
  buttons.splice(buttons.length - 1, 0, createNotificationBell().element);
  const element = createElement('div', { className: 'navbar-top-actions' }, buttons);
  return { element };
}

export function Navbar({ onLogout, onChangePassword }) {
  let mobileNavOpen = false;

  // Opened from the drawer, whose button is gone by the time it closes.
  const settingsDialog = createSettingsDialog({ onLogout, onChangePassword, returnFocus: () => mobileMenuButton });

  const mobileDrawer = createMobileDrawer({
    onNavigate: () => setMobileNavOpen(false),
    onOpenSettings: () => settingsDialog.setSettingsOpen(true)
  });

  const watchPartyDialog = createWatchPartyDialog();
  // "Watch Party starten" from a media context menu, with that title.
  window.addEventListener(OPEN_WATCH_PARTY_EVENT, event => watchPartyDialog.openWith(event.detail?.item));

  const topTabs = createTopTabs({ onNavigate: () => setMobileNavOpen(false) });
  const topActions = createTopActions({ onOpenWatchParty: () => watchPartyDialog.open() });

  const mobileMenuButton = createElement('button', {
    className: 'mobile-menu-button',
    type: 'button',
    'aria-label': 'Navigation öffnen',
    'aria-expanded': 'false',
    'aria-controls': 'mobile-navigation',
    onClick: (event) => {
      event.stopPropagation();
      setMobileNavOpen(!mobileNavOpen);
    }
  },
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' }),
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' }),
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' })
  );

  const element = createElement('nav', { className: 'navbar navbar-spotlight' },
    createElement('div', { className: 'navbar-left' }, mobileMenuButton),
    createElement('div', { className: 'navbar-center' }, topTabs.element),
    createElement('div', { className: 'navbar-right' }, topActions.element)
  );

  document.body.appendChild(mobileDrawer.mobileNavBackdrop);
  document.body.appendChild(mobileDrawer.mobileNavList);
  document.body.appendChild(settingsDialog.element);
  document.body.appendChild(watchPartyDialog.element);

  let isScrolled = null;
  const setScrolled = (scrolled) => {
    if (isScrolled === !!scrolled) return;
    isScrolled = !!scrolled;
    element.classList.toggle('scrolled', isScrolled);
  };

  const update = ({ currentHash, user, scrolled }) => {
    setScrolled(scrolled);

    const displayName = user?.name || user?.Name || user?.username || user?.Username || 'Username';
    settingsDialog.setUsername(displayName);
    mobileDrawer.setUser(displayName);

    topTabs.updateActive(currentHash);
    mobileDrawer.updateActive(currentHash);
  };

  // On a phone the open drawer is a step of its own: Back (Android's too)
  // closes it instead of leaving the page behind it. `fromHistory`: the
  // entry is already gone (Back was pressed, or a link took it away).
  let navEntry = false;
  const setMobileNavOpen = (open, { fromHistory = false } = {}) => {
    if (mobileNavOpen === open) return;

    if (open) {
      try {
        window.history.pushState({ vantaMobileNav: true }, '');
        navEntry = true;
      } catch {
        navEntry = false;
      }
    } else if (navEntry) {
      navEntry = false;
      if (!fromHistory) window.history.back();
    }

    mobileNavOpen = open;
    element.classList.toggle('mobile-open', mobileNavOpen);
    mobileMenuButton.setAttribute('aria-expanded', mobileNavOpen ? 'true' : 'false');
    mobileMenuButton.setAttribute('aria-label', mobileNavOpen ? 'Navigation schließen' : 'Navigation öffnen');
    document.documentElement.classList.toggle('mobile-nav-open', mobileNavOpen);
    document.body.classList.toggle('mobile-nav-open', mobileNavOpen);

    // The page behind is out of reach while the drawer is open; the focus
    // goes in and comes back to the menu button.
    element.closest('.app-shell')?.toggleAttribute('inert', mobileNavOpen);
    if (mobileNavOpen) {
      window.requestAnimationFrame(() => focusableIn(mobileDrawer.mobileNavList)[0]?.focus({ preventScroll: true }));
    } else {
      mobileDrawer.resetToNav();
      if (mobileDrawer.mobileNavList.contains(document.activeElement)) mobileMenuButton.focus({ preventScroll: true });
    }
  };

  document.addEventListener('click', (event) => {
    if (!mobileNavOpen || element.contains(event.target) || mobileDrawer.mobileNavList.contains(event.target)) return;
    setMobileNavOpen(false);
  });

  // Back while the drawer is open closes it; any other way to another page
  // (Forward, a link elsewhere) closes it too.
  window.addEventListener('popstate', () => {
    if (mobileNavOpen) setMobileNavOpen(false, { fromHistory: true });
  });
  window.addEventListener('hashchange', () => {
    if (mobileNavOpen) setMobileNavOpen(false, { fromHistory: true });
  });

  // A link in the drawer: its history entry goes first, then the page
  // changes (see utils/historyEntry.js). Capture: before the link's own
  // handler closes the drawer.
  const followDrawerLink = event => {
    if (!mobileNavOpen) return;
    const target = inAppLinkOf(event);
    if (!target) return;
    event.preventDefault();
    const hadEntry = navEntry;
    navEntry = false;
    setMobileNavOpen(false, { fromHistory: true });
    if (hadEntry) followAfterBack(target);
    else window.location.hash = target;
  };
  mobileDrawer.mobileNavList.addEventListener('click', followDrawerLink, true);
  element.addEventListener('click', followDrawerLink, true);

  window.addEventListener('keydown', (event) => {
    if (!mobileNavOpen) return;
    if (event.key === 'Escape') {
      setMobileNavOpen(false);
      return;
    }
    // Tab wraps inside the drawer.
    if (event.key !== 'Tab') return;
    const focusable = focusableIn(mobileDrawer.mobileNavList);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  settingsDialog.loadAdminVisibility?.();

  // Dots: own requests / reports with a new answer on their entries, work
  // waiting for an admin on the gear and on Admin-Tools.
  notificationsStore.subscribe(({ mine, adminTotal }) => {
    mobileDrawer.setIndicators({
      requests: mine.requests > 0,
      report: mine.reports > 0,
      settings: adminTotal > 0
    });
    settingsDialog.setAdminBadge(adminTotal);
  });

  return {
    element,
    update,
    setScrolled,
    openSettings: () => settingsDialog.setSettingsOpen(true),
    openWatchParty: () => watchPartyDialog.open()
  };
}
