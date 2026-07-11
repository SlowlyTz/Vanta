import { createElement } from '../../utils/dom.js';
import { NAV_LINKS } from './navLinks.js';
import { createNavIcon, createCloseIcon, createChevronIcon } from './icons.js';
import { createMobileSettings } from './mobileSettings.js';
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

function renderGenreSubmenu(submenu, genres, type, overviewHref, overviewLabel, onNavigate) {
  submenu.innerHTML = '';
  submenu.removeAttribute('aria-busy');
  submenu.appendChild(createSubmenuLink(overviewHref, overviewLabel, onNavigate));

  (genres || []).slice(0, 12).forEach(genre => {
    submenu.appendChild(
      createSubmenuLink(`#/genre/${type}/${encodeURIComponent(genre.Name)}`, genre.Name, onNavigate)
    );
  });
}

function renderPublisherSubmenu(submenu, publishers, onNavigate) {
  submenu.innerHTML = '';
  submenu.removeAttribute('aria-busy');
  submenu.appendChild(createSubmenuLink('#/publishers', 'Alle Publisher', onNavigate));

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

export function createMobileDrawer({ onLogout, onChangePassword, onNavigate }) {
  const mobileNavList = createElement('nav', {
    className: 'mobile-drawer-nav',
    id: 'mobile-navigation',
    'aria-label': 'Mobile Navigation'
  });

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
      onClick: () => onNavigate?.()
    }, createCloseIcon())
  );

  const mobileNavLinksList = createElement('ul', { className: 'mobile-drawer-list' });
  mobileNavList.appendChild(mobileDrawerHeader);
  mobileNavList.appendChild(mobileNavLinksList);

  const mobileNavEntries = new Map();
  const accordionSubmenus = new Map();
  const accordionLoaded = new Set();

  const accordionLoaders = {
    movies: (submenu) => MediaApi.getGenres('Movie')
      .then(genres => renderGenreSubmenu(submenu, genres, 'Movie', '#/movies', 'Alle Filme', onNavigate))
      .catch(error => {
        console.error('Failed to load movie genres:', error);
        showSubmenuError(submenu, 'Genres konnten nicht geladen werden');
      }),
    series: (submenu) => MediaApi.getGenres('Series')
      .then(genres => renderGenreSubmenu(submenu, genres, 'Series', '#/series', 'Alle Serien', onNavigate))
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

  NAV_LINKS.forEach(link => {
    if (ACCORDION_KEYS.has(link.key)) {
      const submenu = createElement('ul', { className: 'mobile-drawer-submenu', hidden: true });

      const trigger = createElement('button', {
        className: 'navbar-link mobile-drawer-accordion-trigger',
        type: 'button',
        'aria-expanded': 'false'
      },
        createNavIcon(link.key),
        createElement('span', { className: 'mobile-nav-label' }, link.label),
        createElement('span', { className: 'mobile-drawer-chevron' }, createChevronIcon())
      );

      const item = createElement('li', {
        className: 'navbar-item mobile-nav-link-item mobile-drawer-accordion',
        dataset: { mobileAccordion: link.key }
      }, trigger, submenu);

      trigger.addEventListener('click', () => toggleAccordion(link.key, item, trigger, submenu));

      mobileNavEntries.set(link.key, trigger);
      accordionSubmenus.set(link.key, submenu);
      mobileNavLinksList.appendChild(item);
      return;
    }

    const anchor = createElement('a', {
      className: 'navbar-link',
      href: link.href,
      onClick: () => onNavigate?.()
    },
      createNavIcon(link.key),
      createElement('span', { className: 'mobile-nav-label' }, link.label)
    );

    const item = createElement('li', { className: 'navbar-item mobile-nav-link-item' }, anchor);
    mobileNavEntries.set(link.key, anchor);
    mobileNavLinksList.appendChild(item);
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

  const mobileSettingsItem = createElement('li', { className: 'navbar-item navbar-mobile-settings-item mobile-nav-link-item' }, mobileSettingsButton);
  mobileNavLinksList.appendChild(mobileSettingsItem);

  const mobileProfileLink = createElement('a', {
    className: 'navbar-link',
    href: '#/profile',
    onClick: () => onNavigate?.()
  },
    createNavIcon('profile'),
    createElement('span', { className: 'mobile-nav-label' }, 'Profil')
  );

  const mobileProfileItem = createElement('li', { className: 'navbar-item mobile-nav-link-item' }, mobileProfileLink);
  mobileNavLinksList.appendChild(mobileProfileItem);

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
    onClick: () => onNavigate?.()
  });

  const updateActive = (currentHash) => {
    NAV_LINKS.forEach(link => {
      const anchor = mobileNavEntries.get(link.key);
      if (!anchor) return;
      const isActive = isNavLinkActive(link, currentHash);
      anchor.classList.toggle('active', isActive);
      if (isActive) anchor.setAttribute('aria-current', 'page');
      else anchor.removeAttribute('aria-current');
    });

    accordionSubmenus.forEach(submenu => {
      submenu.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        const isActive = currentHash === href || currentHash.startsWith(`${href}?`);
        link.classList.toggle('active', isActive);
        if (isActive) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    });

    const profileActive = isNavLinkActive({ key: 'profile' }, currentHash);
    mobileProfileLink.classList.toggle('active', profileActive);
    if (profileActive) mobileProfileLink.setAttribute('aria-current', 'page');
    else mobileProfileLink.removeAttribute('aria-current');
  };

  const resetToNav = () => {
    mobileSettings.setMobileSettingsView('nav');
  };

  return {
    mobileNavList,
    mobileNavBackdrop,
    mobileSettings,
    updateActive,
    resetToNav
  };
}
