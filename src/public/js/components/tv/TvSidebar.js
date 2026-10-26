// TV mode navigation: an icon-only column on the left that shows its labels
// while the focus is in it. The admin area is not part of the TV interface.
import { createElement } from '../../utils/dom.js';
import { createNavIcon, createTopbarIcon, createSettingsGearIcon } from '../navbar/icons.js';
import { isNavLinkActive } from '../navbar/activeNav.js';

export const TV_SIDEBAR_ENTRIES = [
  { key: 'search', label: 'Suche', href: '#/search', icon: () => createTopbarIcon('search') },
  { key: 'home', label: 'Startseite', href: '#/home', icon: () => createNavIcon('home') },
  { key: 'movies', label: 'Filme', href: '#/movies', icon: () => createNavIcon('movies') },
  { key: 'series', label: 'Serien', href: '#/series', icon: () => createNavIcon('series') },
  { key: 'watchlist', label: 'Meine Liste', href: '#/profile?tab=watchlist', icon: () => createNavIcon('watchlist') },
  { key: 'requests', label: 'Anfragen', href: '#/requests', icon: () => createNavIcon('requests') },
  { key: 'party', label: 'Watch Party', action: 'watchParty', icon: () => createTopbarIcon('group') },
  { key: 'profile', label: 'Profil', href: '#/profile', icon: () => createTopbarIcon('profile') },
  { key: 'screensaver', label: 'Bildschirmschoner', action: 'screensaver', icon: () => createTopbarIcon('screensaver') },
  { key: 'settings', label: 'Einstellungen', action: 'settings', icon: () => createSettingsGearIcon() },
];

export function TvSidebar({ onOpenSettings, onOpenWatchParty, onOpenScreensaver } = {}) {
  const actions = { settings: onOpenSettings, watchParty: onOpenWatchParty, screensaver: onOpenScreensaver };
  const items = new Map();
  const list = createElement('ul', { className: 'tv-sidebar-list' });

  for (const entry of TV_SIDEBAR_ENTRIES) {
    const content = [
      createElement('span', { className: 'tv-sidebar-icon', 'aria-hidden': 'true' }, entry.icon()),
      createElement('span', { className: 'tv-sidebar-label' }, entry.label)
    ];
    const control = entry.href
      ? createElement('a', { className: 'tv-sidebar-link', href: entry.href, dataset: { tvKey: `nav-${entry.key}` } }, ...content)
      : createElement('button', {
        type: 'button',
        className: 'tv-sidebar-link',
        dataset: { tvKey: `nav-${entry.key}` },
        onClick: () => actions[entry.action]?.()
      }, ...content);
    const item = createElement('li', { className: 'tv-sidebar-item' }, control);
    items.set(entry.key, { item, control, entry });
    list.appendChild(item);
  }

  const element = createElement('nav', {
    className: 'tv-sidebar',
    'aria-label': 'Navigation',
    'data-tv-group': 'nav',
    // Up and down stay in the sidebar; right leaves it for the page.
    'data-tv-column': ''
  },
    createElement('div', { className: 'tv-sidebar-brand', 'aria-hidden': 'true' },
      createElement('img', { src: '/assets/logo-vanta.png', alt: '' })
    ),
    list
  );

  return {
    element,
    update({ currentHash }) {
      for (const { control, entry } of items.values()) {
        const active = entry.href ? isNavLinkActive({ key: entry.key }, currentHash) : false;
        control.classList.toggle('active', active);
        if (active) control.setAttribute('aria-current', 'page');
        else control.removeAttribute('aria-current');
      }
    },
    isOpen: () => element.contains(document.activeElement),
    // Back into the content where the focus left it (the focus engine remembers).
    close() {
      window.dispatchEvent(new CustomEvent('vanta:tv-focus-content'));
    }
  };
}
