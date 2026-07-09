import { createElement, $ } from '../../utils/dom.js';
import { NAV_LINKS } from './navLinks.js';
import { createNavIcon } from './icons.js';
import { isNavLinkActive } from './activeNav.js';

const isDesktopNav = () => window.matchMedia('(min-width: 769px)').matches;

const getSearchQueryFromHash = (hash = window.location.hash) => {
  const [, queryString = ''] = hash.split('?');
  return new URLSearchParams(queryString).get('q') || '';
};

const getSearchHash = (query) => {
  const trimmed = query.trim();
  return trimmed ? `#/search?q=${encodeURIComponent(trimmed)}` : '#/search';
};

export function createDesktopNav({ onNavigate }) {
  const navList = createElement('ul', { className: 'navbar-nav', id: 'primary-navigation' });
  let navbarSearchDebounce = null;

  NAV_LINKS.filter(link => link.key !== 'search').forEach(link => {
    const anchor = createElement('a', {
      className: 'navbar-link',
      href: link.href,
      id: `nav-${link.key}`,
      onClick: () => onNavigate?.()
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

  const brandLink = createElement('a', {
    className: 'navbar-brand',
    'aria-label': 'VANTA Startseite',
    href: '#/home',
    onClick: () => onNavigate?.()
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

  const updateActive = (currentHash) => {
    NAV_LINKS.forEach(link => {
      const linkEl = $(`#nav-${link.key}`, navList);
      if (!linkEl) return;
      const isActive = isNavLinkActive(link, currentHash);
      linkEl.classList.toggle('active', isActive);
      if (isActive) linkEl.setAttribute('aria-current', 'page');
      else linkEl.removeAttribute('aria-current');
    });

    const searchIsActive = currentHash.startsWith('#/search');
    navbarSearchForm.classList.toggle('active', searchIsActive);
    if (searchIsActive) navbarSearchForm.setAttribute('aria-current', 'page');
    else navbarSearchForm.removeAttribute('aria-current');
    if (document.activeElement !== navbarSearchInput) {
      navbarSearchInput.value = searchIsActive ? getSearchQueryFromHash(currentHash) : '';
    }
  };

  return {
    brandLink,
    navList,
    navbarSearchForm,
    navbarSearchInput,
    updateActive
  };
}
