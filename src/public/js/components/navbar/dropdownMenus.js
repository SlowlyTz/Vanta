import { MediaApi } from '../../api/media.api.js';
import { createElement, $ } from '../../utils/dom.js';
import { NAV_LINKS } from './navLinks.js';
import { getFeaturedPublishersFromStudios } from '../../constants/featuredPublishers.js';

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

  const featured = getFeaturedPublishersFromStudios(studios);

  if (featured.length === 0) {
    menu.appendChild(createElement('li', { className: 'dropdown-item-disabled' }, 'Keine Publisher gefunden'));
    return;
  }

  featured.forEach(publisher => {
    menu.appendChild(
      createElement('li', { className: 'dropdown-list-item' },
        createElement('a', {
          className: 'dropdown-item dropdown-item-publisher',
          href: `#/publisher-group/${encodeURIComponent(publisher.id)}`
        }, publisher.label)
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
