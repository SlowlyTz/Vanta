import { MediaApi } from '../../api/media.api.js';
import { createElement, $ } from '../../utils/dom.js';
import { NAV_LINKS } from './navLinks.js';

export const FEATURED_STUDIOS = [
  { match: ['disney', 'walt disney', 'walt disney pictures', 'walt disney studios', 'walt disney animation studios'], label: 'Disney' },
  { match: ['20th century', '20th century studios', '20th century fox', 'twentieth century fox'], label: '20th Century Studios' },
  { match: ['warner bros', 'warner bros pictures', 'warner brothers', 'warner bros.'], label: 'Warner Bros' },
  { match: ['netflix'], label: 'Netflix' },
  { match: ['apple tv', 'apple tv+', 'appletv', 'apple'], label: 'Apple TV' },
  { match: ['amazon', 'prime video', 'amazon studios', 'amazon prime', 'amazon mgm studios'], label: 'Prime Video' },
  { match: ['hbo', 'hbo max', 'hbo films', 'home box office'], label: 'HBO' }
];

export function matchFeaturedStudio(studioName) {
  const lower = studioName.toLowerCase();
  for (const entry of FEATURED_STUDIOS) {
    if (entry.match.some(pattern => lower === pattern || lower.startsWith(pattern))) {
      return entry;
    }
  }
  return null;
}

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

export function loadDropdowns(navbarElement) {
  NAV_LINKS.filter(link => link.type).forEach(link => {
    const menu = $(`#${link.menuId}`, navbarElement);
    if (!menu) return;

    MediaApi.getGenres(link.type)
      .then(genres => renderGenreMenu(menu, genres, link.type))
      .catch(error => {
        console.error(`Failed to load ${link.type} genres:`, error);
        menu.innerHTML = '';
        menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Genres gefunden'));
      });
  });

  const studiosLink = NAV_LINKS.find(link => link.isStudios);
  if (studiosLink) {
    const menu = $(`#${studiosLink.menuId}`, navbarElement);
    if (menu) {
      MediaApi.getStudios()
        .then(studios => renderStudiosMenu(menu, studios))
        .catch(error => {
          console.error('Failed to load studios:', error);
          menu.innerHTML = '';
          menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Publisher gefunden'));
        });
    }
  }
}
