import { createElement } from '../../utils/dom.js';
import { createMobileDrawer } from './mobileDrawer.js';
import { TOP_TABS, TOP_ACTIONS } from './navLinks.js';
import { createTopbarIcon } from './icons.js';
import { isNavLinkActive } from './activeNav.js';
import { createWatchPartyDialog } from '../watch-party/createWatchPartyDialog.js';

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

function createTopActions({ onOpenWatchParty }) {
  const buttons = TOP_ACTIONS.map(action => {
    const attrs = {
      className: `navbar-action-button navbar-action-${action.key}`,
      'aria-label': action.label
    };

    if (action.href) {
      return createElement('a', { ...attrs, href: action.href }, createTopbarIcon(action.key));
    }

    return createElement('button', {
      ...attrs,
      type: 'button',
      onClick: action.key === 'group' ? () => onOpenWatchParty?.() : undefined
    }, createTopbarIcon(action.key));
  });

  const element = createElement('div', { className: 'navbar-top-actions' }, buttons);
  return { element };
}

export function Navbar({ onLogout, onChangePassword }) {
  let mobileNavOpen = false;

  const mobileDrawer = createMobileDrawer({
    onLogout,
    onChangePassword,
    onNavigate: () => setMobileNavOpen(false)
  });

  const watchPartyDialog = createWatchPartyDialog();

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
  document.body.appendChild(watchPartyDialog.element);

  const update = ({ currentHash, user, scrolled }) => {
    element.classList.toggle('scrolled', !!scrolled);

    const displayName = user?.name || user?.Name || user?.username || user?.Username || 'Username';
    mobileDrawer.mobileSettings.mobileSettingsUsername.textContent = displayName;

    topTabs.updateActive(currentHash);
    mobileDrawer.updateActive(currentHash);
  };

  const setMobileNavOpen = (open) => {
    if (mobileNavOpen === open) return;

    mobileNavOpen = open;
    element.classList.toggle('mobile-open', mobileNavOpen);
    mobileMenuButton.setAttribute('aria-expanded', mobileNavOpen ? 'true' : 'false');
    mobileMenuButton.setAttribute('aria-label', mobileNavOpen ? 'Navigation schließen' : 'Navigation öffnen');
    document.documentElement.classList.toggle('mobile-nav-open', mobileNavOpen);
    document.body.classList.toggle('mobile-nav-open', mobileNavOpen);

    if (!mobileNavOpen) {
      mobileDrawer.resetToNav();
    }
  };

  document.addEventListener('click', (event) => {
    if (!mobileNavOpen || element.contains(event.target) || mobileDrawer.mobileNavList.contains(event.target)) return;
    setMobileNavOpen(false);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (mobileNavOpen) setMobileNavOpen(false);
  });

  mobileDrawer.mobileSettings.loadAdminVisibility?.();

  return { element, update };
}
