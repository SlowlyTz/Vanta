import { MediaApi } from '../../api/media.api.js';
import { createElement, $ } from '../../utils/dom.js';
import { NAV_LINKS } from './navLinks.js';
import { FEATURED_STUDIOS, matchFeaturedStudio } from '../../constants/featuredStudios.js';

export function renderGenreMenu(menu, genres, type) {
  menu.innerHTML = '';

  if (!genres || genres.length === 0) {
    menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Genres gefunden'));
    return;
  }

  genres.slice(0, 12).forEach(genre => {
    menu.appendChild(
      createElement('li', { className: 'dropdown-list-item' },
        createElement('a', {
          className: 'dropdown-item',
          href: `#/genre/${type}/${encodeURIComponent(genre.Name)}`
        }, genre.Name)
      )
    );
  });
}

export function renderStudiosMenu(menu, studios) {
  menu.innerHTML = '';

  const featured = [];
  const seen = new Set();

  for (const studio of studios) {
    const match = matchFeaturedStudio(studio.Name);
    if (match && !seen.has(match.label)) {
      seen.add(match.label);
      featured.push({ ...studio, displayLabel: match.label, order: FEATURED_STUDIOS.indexOf(match) });
    }
  }

  featured.sort((a, b) => a.order - b.order);

  if (featured.length === 0) {
    menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Publisher gefunden'));
    return;
  }

  featured.forEach(studio => {
    menu.appendChild(
      createElement('li', { className: 'dropdown-list-item' },
        createElement('a', {
          className: 'dropdown-item dropdown-item-publisher',
          href: `#/publisher/${encodeURIComponent(studio.Name)}`
        }, studio.displayLabel)
      )
    );
  });
}

function showMenuLoading(menu) {
  menu.innerHTML = '';
  menu.setAttribute('aria-busy', 'true');
  menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Lädt…'));
}

export function loadDropdowns(navbarElement) {
  NAV_LINKS.filter(link => link.type).forEach(link => {
    const menu = $(`#${link.menuId}`, navbarElement);
    if (!menu) return;

    showMenuLoading(menu);

    MediaApi.getGenres(link.type)
      .then(genres => renderGenreMenu(menu, genres, link.type))
      .catch(error => {
        console.error(`Failed to load ${link.type} genres:`, error);
        menu.innerHTML = '';
        menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Genres gefunden'));
      })
      .finally(() => menu.removeAttribute('aria-busy'));
  });

  const studiosLink = NAV_LINKS.find(link => link.isStudios);
  if (studiosLink) {
    const menu = $(`#${studiosLink.menuId}`, navbarElement);
    if (menu) {
      showMenuLoading(menu);

      MediaApi.getStudios()
        .then(studios => renderStudiosMenu(menu, studios))
        .catch(error => {
          console.error('Failed to load studios:', error);
          menu.innerHTML = '';
          menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Publisher gefunden'));
        })
        .finally(() => menu.removeAttribute('aria-busy'));
    }
  }
}
