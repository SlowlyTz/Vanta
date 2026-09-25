import { createElement } from '../../utils/dom.js';
import { NAV_LINKS } from './navLinks.js';
import { createNavIcon, createCloseIcon, createChevronIcon } from './icons.js';
import { isNavLinkActive } from './activeNav.js';
import { MediaApi } from '../../api/media.api.js';
import { getFeaturedPublishersFromStudios } from '../../constants/featuredPublishers.js';

const ACCORDION_KEYS = new Set(['movies', 'series', 'publishers']);

function createSubmenuLink(href, label, onNavigate) {
  return createElement('li', { className: 'mobile-drawer-submenu-item' },
    createElement('a', {
      className: 'mobile-drawer-submenu-link',
      href,
      onClick: () => onNavigate?.()
    }, label)
  );
}

function renderGenreSubmenu(submenu, genres, type, onNavigate) {
  submenu.innerHTML = '';
  submenu.removeAttribute('aria-busy');

  (genres || []).slice(0, 12).forEach(genre => {
    submenu.appendChild(
      createSubmenuLink(`#/genre/${type}/${encodeURIComponent(genre.Name)}`, genre.Name, onNavigate)
    );
  });
}

function renderPublisherSubmenu(submenu, publishers, onNavigate) {
  submenu.innerHTML = '';
  submenu.removeAttribute('aria-busy');

  (publishers || []).forEach(publisher => {
    submenu.appendChild(
      createSubmenuLink(`#/publisher-group/${encodeURIComponent(publisher.id)}`, publisher.label, onNavigate)
    );
  });
}

function setSubmenuHeight(submenu, open) {
  submenu.style.maxHeight = open ? `${submenu.scrollHeight}px` : '0px';
}

function showSubmenuLoading(submenu) {
  submenu.innerHTML = '';
  submenu.setAttribute('aria-busy', 'true');
  submenu.appendChild(createElement('li', { className: 'mobile-drawer-submenu-item mobile-drawer-submenu-empty' }, 'Lädt…'));
}

function showSubmenuError(submenu, message) {
  submenu.innerHTML = '';
  submenu.removeAttribute('aria-busy');
  submenu.appendChild(createElement('li', { className: 'mobile-drawer-submenu-item mobile-drawer-submenu-empty' }, message));
}

// Entries of the drawer, in two groups; everything about the user (profile,
// settings) sits in the card pinned to the bottom.
const DRAWER_SECTIONS = [
  { label: 'Entdecken', keys: ['home', 'movies', 'series', 'publishers', 'scroller'] },
  { label: 'Mehr', keys: ['requests'] }
];

const initialOf = name => (String(name || '').trim().charAt(0) || '?').toUpperCase();

export function createMobileDrawer({ onNavigate, onOpenSettings }) {
  const mobileNavList = createElement('nav', {
    className: 'mobile-drawer-nav',
    id: 'mobile-navigation',
    'aria-label': 'Navigation'
  });

  const mobileDrawerHeader = createElement('div', { className: 'mobile-drawer-header' },
    createElement('a', {
      className: 'mobile-drawer-brand',
      href: '#/home',
      'aria-label': 'VANTA Startseite',
      onClick: () => onNavigate?.()
    }, createElement('img', {
      className: 'mobile-drawer-logo',
      src: '/assets/logo-vanta.png',
      alt: 'VANTA'
    })),
    createElement('button', {
      className: 'mobile-drawer-close',
      type: 'button',
      'aria-label': 'Navigation schließen',
      onClick: () => onNavigate?.()
    }, createCloseIcon())
  );

  const scrollArea = createElement('div', { className: 'mobile-drawer-scroll' });
  mobileNavList.appendChild(mobileDrawerHeader);
  mobileNavList.appendChild(scrollArea);

  const mobileNavEntries = new Map();
  const accordionSubmenus = new Map();
  const accordionLoaded = new Set();

  const accordionLoaders = {
    movies: (submenu) => MediaApi.getGenres('Movie')
      .then(genres => renderGenreSubmenu(submenu, genres, 'Movie', onNavigate))
      .catch(error => {
        console.error('Failed to load movie genres:', error);
        showSubmenuError(submenu, 'Genres konnten nicht geladen werden');
      }),
    series: (submenu) => MediaApi.getGenres('Series')
      .then(genres => renderGenreSubmenu(submenu, genres, 'Series', onNavigate))
      .catch(error => {
        console.error('Failed to load series genres:', error);
        showSubmenuError(submenu, 'Genres konnten nicht geladen werden');
      }),
    publishers: (submenu) => MediaApi.getStudios()
      .then(studios => renderPublisherSubmenu(submenu, getFeaturedPublishersFromStudios(studios), onNavigate))
      .catch(error => {
        console.error('Failed to load publishers:', error);
        showSubmenuError(submenu, 'Publisher konnten nicht geladen werden');
      })
  };

  function toggleAccordion(key, item, trigger, submenu) {
    const nextOpen = !item.classList.contains('is-open');
    trigger.setAttribute('aria-expanded', String(nextOpen));

    if (nextOpen) {
      item.classList.add('is-open');
      submenu.hidden = false;

      if (!accordionLoaded.has(key)) {
        accordionLoaded.add(key);
        showSubmenuLoading(submenu);
        requestAnimationFrame(() => setSubmenuHeight(submenu, true));

        accordionLoaders[key]?.(submenu).then(() => {
          if (item.classList.contains('is-open')) setSubmenuHeight(submenu, true);
        });
        return;
      }

      requestAnimationFrame(() => setSubmenuHeight(submenu, true));
    } else {
      item.classList.remove('is-open');
      setSubmenuHeight(submenu, false);
      submenu.addEventListener('transitionend', () => {
        if (!item.classList.contains('is-open')) submenu.hidden = true;
      }, { once: true });
    }
  }

  const createEntry = link => {
    const anchor = createElement('a', {
      className: ACCORDION_KEYS.has(link.key) ? 'navbar-link mobile-drawer-accordion-link' : 'navbar-link',
      href: link.href,
      onClick: () => onNavigate?.()
    },
      createNavIcon(link.key),
      createElement('span', { className: 'mobile-nav-label' }, link.label)
    );
    mobileNavEntries.set(link.key, anchor);

    if (!ACCORDION_KEYS.has(link.key)) {
      return createElement('li', { className: 'navbar-item mobile-nav-link-item' }, anchor);
    }

    const submenu = createElement('ul', { className: 'mobile-drawer-submenu', hidden: true });
    const toggleButton = createElement('button', {
      className: 'mobile-drawer-accordion-toggle',
      type: 'button',
      'aria-expanded': 'false',
      'aria-label': `${link.label} Untermenü öffnen`
    }, createElement('span', { className: 'mobile-drawer-chevron' }, createChevronIcon()));

    const trigger = createElement('div', { className: 'mobile-drawer-accordion-trigger' }, anchor, toggleButton);
    const item = createElement('li', {
      className: 'navbar-item mobile-nav-link-item mobile-drawer-accordion',
      dataset: { mobileAccordion: link.key }
    }, trigger, submenu);

    const handleToggle = () => toggleAccordion(link.key, item, toggleButton, submenu);
    toggleButton.addEventListener('click', handleToggle);
    toggleButton.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      handleToggle();
    });

    accordionSubmenus.set(link.key, submenu);
    return item;
  };

  // Stagger order for the fly-in animation, see drawer-shell.css.
  let flyIndex = 0;
  const fly = element => {
    element.style.setProperty('--fly-index', String(flyIndex));
    flyIndex += 1;
    return element;
  };
  fly(mobileDrawerHeader);

  DRAWER_SECTIONS.forEach(section => {
    const label = fly(createElement('p', { className: 'mobile-drawer-section-label', 'aria-hidden': 'true' }, section.label));
    const list = createElement('ul', { className: 'mobile-drawer-list', 'aria-label': section.label });
    section.keys
      .map(key => NAV_LINKS.find(link => link.key === key))
      .filter(Boolean)
      .forEach(link => list.appendChild(fly(createEntry(link))));
    scrollArea.appendChild(createElement('section', { className: 'mobile-drawer-section' }, label, list));
  });

  // The user card: the whole card opens the profile, the gear the settings.
  const avatar = createElement('span', { className: 'mobile-drawer-avatar', 'aria-hidden': 'true' }, '?');
  const userName = createElement('strong', { className: 'mobile-drawer-user-name' }, '');
  const mobileProfileLink = createElement('a', {
    className: 'mobile-drawer-profile',
    href: '#/profile',
    onClick: () => onNavigate?.()
  },
    avatar,
    createElement('span', { className: 'mobile-drawer-user' },
      userName,
      createElement('span', { className: 'mobile-drawer-user-hint' }, 'Profil, Verlauf & Favoriten')
    )
  );

  const mobileSettingsButton = createElement('button', {
    className: 'mobile-drawer-settings navbar-mobile-settings',
    type: 'button',
    'aria-label': 'Einstellungen',
    title: 'Einstellungen',
    onClick: () => {
      onNavigate?.();
      onOpenSettings?.();
    }
  }, createNavIcon('settings'));

  const footer = fly(createElement('div', { className: 'mobile-drawer-footer' }, mobileProfileLink, mobileSettingsButton));
  mobileNavList.appendChild(footer);

  const mobileNavBackdrop = createElement('div', {
    className: 'mobile-nav-backdrop',
    'aria-hidden': 'true',
    onClick: () => onNavigate?.()
  });

  const setActive = (anchor, isActive) => {
    anchor.classList.toggle('active', isActive);
    if (isActive) anchor.setAttribute('aria-current', 'page');
    else anchor.removeAttribute('aria-current');
  };

  const updateActive = (currentHash) => {
    NAV_LINKS.forEach(link => {
      const anchor = mobileNavEntries.get(link.key);
      if (anchor) setActive(anchor, isNavLinkActive(link, currentHash));
    });

    accordionSubmenus.forEach(submenu => {
      submenu.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        setActive(link, currentHash === href || currentHash.startsWith(`${href}?`));
      });
    });

    setActive(mobileProfileLink, isNavLinkActive({ key: 'profile' }, currentHash));
  };

  const setUser = name => {
    userName.textContent = name || 'Profil';
    avatar.textContent = initialOf(name);
  };

  const resetToNav = () => {
    mobileDrawerHeader.hidden = false;
    scrollArea.hidden = false;
  };

  return {
    mobileNavList,
    mobileNavBackdrop,
    updateActive,
    setUser,
    resetToNav
  };
}
