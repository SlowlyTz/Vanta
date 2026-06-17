import { settingsStore } from '../store/settings.store.js';
import { createElement, $ } from '../utils/dom.js';
import { NAV_LINKS } from './navbar/navLinks.js';
import { createNavIcon, createCloseIcon } from './navbar/icons.js';
import { loadDropdowns } from './navbar/dropdownMenus.js';
import { createSettingsDialog } from './navbar/settingsDialog.js';
import { createMobileSettings } from './navbar/mobileSettings.js';

export function Navbar({ onLogout, onChangePassword }) {
  const navList = createElement('ul', { className: 'navbar-nav' });
  let mobileNavOpen = false;
  let navbarSearchDebounce = null;

  const isDesktopNav = () => window.matchMedia('(min-width: 769px)').matches;
  const getSearchQueryFromHash = (hash = window.location.hash) => {
    const [, queryString = ''] = hash.split('?');
    return new URLSearchParams(queryString).get('q') || '';
  };
  const getSearchHash = (query) => {
    const trimmed = query.trim();
    return trimmed ? `#/search?q=${encodeURIComponent(trimmed)}` : '#/search';
  };

  NAV_LINKS.filter(link => link.key !== 'search').forEach(link => {
    const anchor = createElement('a', {
      className: 'navbar-link',
      href: link.href,
      id: `nav-${link.key}`,
      onClick: () => setMobileNavOpen(false)
    },
      createNavIcon(link.key),
      createElement('span', { className: 'navbar-link-label' }, link.label)
    );

    if (!link.type && !link.isStudios) {
      const li = createElement('li', { className: `navbar-item navbar-item-${link.key}` }, anchor);
      navList.appendChild(li);
      return;
    }

    const dropdownMenu = createElement('ul', {
      className: 'dropdown-menu',
      id: link.menuId,
      'aria-label': link.isStudios ? 'Publisher' : `${link.label} Genres`
    }, createElement('li', { className: 'dropdown-item-loading' }, link.isStudios ? 'Lade Publisher...' : 'Lade Genres...'));

    navList.appendChild(
      createElement('li', { className: `navbar-item navbar-item-${link.key} dropdown` },
        anchor,
        dropdownMenu
      )
    );
  });

  const mobileSettingsButton = createElement('button', {
    className: 'navbar-link navbar-mobile-settings',
    type: 'button',
    onClick: () => {
      mobileDrawerHeader.hidden = true;
      mobileNavLinksList.hidden = true;
      mobileSettings.setMobileSettingsView('root');
    }
  },
    createNavIcon('settings'),
    createElement('span', { className: 'mobile-nav-label' }, 'Einstellungen')
  );

  const mobileNavList = createElement('nav', {
    className: 'mobile-drawer-nav',
    id: 'mobile-navigation',
    'aria-label': 'Mobile Navigation'
  });

  const mobileNavItems = [];
  const mobileNavEntries = new Map();

  const mobileDrawerHeader = createElement('div', { className: 'mobile-drawer-header' },
    createElement('img', {
      className: 'mobile-drawer-logo',
      src: '/assets/logo-vanta.png',
      alt: 'VANTA'
    }),
    createElement('button', {
      className: 'mobile-drawer-close',
      type: 'button',
      'aria-label': 'Navigation schließen',
      onClick: () => setMobileNavOpen(false)
    }, createCloseIcon())
  );

  const mobileNavLinksList = createElement('ul', { className: 'mobile-drawer-list' });
  mobileNavList.appendChild(mobileDrawerHeader);
  mobileNavList.appendChild(mobileNavLinksList);

  NAV_LINKS.forEach(link => {
    const anchor = createElement('a', {
      className: 'navbar-link',
      href: link.href,
      onClick: () => setMobileNavOpen(false)
    },
      createNavIcon(link.key),
      createElement('span', { className: 'mobile-nav-label' }, link.label)
    );

    const item = createElement('li', { className: 'navbar-item mobile-nav-link-item' }, anchor);
    mobileNavItems.push(item);
    mobileNavEntries.set(link.key, { item, anchor });
    mobileNavLinksList.appendChild(item);
  });

  const mobileSettingsItem = createElement('li', { className: 'navbar-item navbar-mobile-settings-item mobile-nav-link-item' }, mobileSettingsButton);
  mobileNavItems.push(mobileSettingsItem);
  mobileNavLinksList.appendChild(mobileSettingsItem);

  const mobileMenuButton = createElement('button', {
    className: 'mobile-menu-button',
    type: 'button',
    'aria-label': 'Navigation öffnen',
    'aria-expanded': 'false',
    'aria-controls': 'mobile-navigation settings-dialog',
    onClick: (event) => {
      event.stopPropagation();
      if (isDesktopNav()) {
        setMobileNavOpen(false);
        settingsDialog.setSettingsOpen(!settingsDialog.isOpen());
        return;
      }

      settingsDialog.setSettingsOpen(false);
      setMobileNavOpen(!mobileNavOpen);
    }
  },
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' }),
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' }),
    createElement('span', { className: 'mobile-menu-line', 'aria-hidden': 'true' })
  );

  navList.id = 'primary-navigation';

  const settingsDialog = createSettingsDialog({ onLogout, onChangePassword });
  const mobileSettings = createMobileSettings({
    onLogout,
    onChangePassword,
    onNav: () => {
      mobileDrawerHeader.hidden = false;
      mobileNavLinksList.hidden = false;
    }
  });

  mobileNavList.appendChild(mobileSettings.element);

  const mobileNavBackdrop = createElement('div', {
    className: 'mobile-nav-backdrop',
    'aria-hidden': 'true',
    onClick: () => setMobileNavOpen(false)
  });

  const brandLink = createElement('a', {
    className: 'navbar-brand',
    'aria-label': 'VANTA Startseite',
    href: '#/home',
    onClick: () => setMobileNavOpen(false)
  },
    createElement('img', {
      className: 'navbar-brand-logo',
      src: '/assets/logo2.png',
      alt: 'VANTA'
    })
  );

  const navbarSearchInput = createElement('input', {
    className: 'navbar-search-input',
    type: 'search',
    placeholder: 'Suche nach Filmen, Serien, Darstellern...',
    autocomplete: 'off',
    'aria-label': 'Suche',
    onFocus: () => {
      if (isDesktopNav() && !window.location.hash.startsWith('#/search')) {
        window.location.hash = '#/search';
      }
    },
    onInput: (event) => {
      if (!isDesktopNav()) return;
      if (navbarSearchDebounce) clearTimeout(navbarSearchDebounce);
      const query = event.target.value;
      navbarSearchDebounce = setTimeout(() => {
        window.location.hash = getSearchHash(query);
      }, 350);
    }
  });

  const navbarSearchForm = createElement('form', {
    className: 'navbar-search-form',
    role: 'search',
    onSubmit: (event) => {
      event.preventDefault();
      if (!isDesktopNav()) return;
      window.location.hash = getSearchHash(navbarSearchInput.value);
    }
  },
    createNavIcon('search'),
    navbarSearchInput
  );

  const navbarActions = createElement('div', { className: 'navbar-actions' },
    navbarSearchForm,
    mobileMenuButton
  );

  const element = createElement('nav', { className: 'navbar' },
    brandLink,
    navList,
    navbarActions
  );

  document.body.appendChild(mobileNavBackdrop);
  document.body.appendChild(mobileNavList);
  document.body.appendChild(settingsDialog.element);

  const update = ({ currentHash, user, scrolled }) => {
    element.classList.toggle('scrolled', !!scrolled);
    if (!settingsDialog.isOpen() && !mobileNavOpen) {
      mobileMenuButton.setAttribute('aria-label', isDesktopNav() ? 'Einstellungen öffnen' : 'Navigation öffnen');
    }
    const displayName = user?.name || user?.Name || user?.username || user?.Username || 'Username';
    settingsDialog.settingsUsername.textContent = displayName;
    mobileSettings.mobileSettingsUsername.textContent = displayName;
    NAV_LINKS.forEach(link => {
      const linkEl = $(`#nav-${link.key}`, element);
      const isActive =
        (link.key === 'home' && currentHash === '#/home') ||
        (link.key === 'movies' && (currentHash === '#/movies' || currentHash.startsWith('#/genre/Movie'))) ||
        (link.key === 'series' && (currentHash === '#/series' || currentHash.startsWith('#/genre/Series'))) ||
        (link.key === 'publishers' && (currentHash === '#/publishers' || currentHash.startsWith('#/publisher/'))) ||
        (link.key === 'requests' && currentHash === '#/requests') ||
        (link.key === 'search' && currentHash.startsWith('#/search'));
      if (linkEl) {
        linkEl.classList.toggle('active', isActive);
        if (isActive) linkEl.setAttribute('aria-current', 'page');
        else linkEl.removeAttribute('aria-current');
      }
      const mobileEntry = mobileNavEntries.get(link.key);
      if (mobileEntry) {
        mobileEntry.anchor.classList.toggle('active', isActive);
        if (isActive) mobileEntry.anchor.setAttribute('aria-current', 'page');
        else mobileEntry.anchor.removeAttribute('aria-current');
      }
    });
    const searchIsActive = currentHash.startsWith('#/search');
    navbarSearchForm.classList.toggle('active', searchIsActive);
    if (searchIsActive) navbarSearchForm.setAttribute('aria-current', 'page');
    else navbarSearchForm.removeAttribute('aria-current');
    if (document.activeElement !== navbarSearchInput) {
      navbarSearchInput.value = searchIsActive ? getSearchQueryFromHash(currentHash) : '';
    }
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
      mobileSettings.setMobileSettingsView('nav');
    }
  };

  document.addEventListener('click', (event) => {
    if (!mobileNavOpen || element.contains(event.target) || mobileNavList.contains(event.target)) return;
    setMobileNavOpen(false);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (settingsDialog.isOpen()) settingsDialog.setSettingsOpen(false);
    if (mobileNavOpen) setMobileNavOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) setMobileNavOpen(false);
  });

  settingsDialog.syncPlaybackChoices();
  mobileSettings.syncMobilePlaybackChoices();
  settingsStore.subscribe(settingsDialog.syncPlaybackChoices);
  settingsStore.subscribe(mobileSettings.syncMobilePlaybackChoices);
  loadDropdowns(element);
  settingsDialog.loadAdminVisibility?.();
  mobileSettings.loadAdminVisibility?.();

  return { element, update };
}
