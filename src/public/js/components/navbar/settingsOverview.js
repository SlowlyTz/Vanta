import { createElement } from '../../utils/dom.js';
import { createUserIcon, createMovieIcon, createScreenIcon, createPlayOutlineIcon } from './icons.js';

export function createSettingsOverview() {
  const movies = createElement('span', { className: 'settings-stat-value' }, '-');
  const series = createElement('span', { className: 'settings-stat-value' }, '-');
  const episodes = createElement('span', { className: 'settings-stat-value' }, '-');

  return {
    movies,
    series,
    episodes,
    element: createElement('div', { className: 'settings-overview-grid' },
      createSettingsStat('Filme', movies, createMovieIcon()),
      createSettingsStat('Serien', series, createScreenIcon()),
      createSettingsStat('Folgen', episodes, createPlayOutlineIcon())
    )
  };
}

function createSettingsStat(label, valueElement, icon) {
  return createElement('div', { className: 'settings-stat' },
    icon,
    createElement('span', { className: 'settings-stat-label' }, label),
    valueElement
  );
}

export function createSettingsProfile(usernameElement) {
  return createElement('div', { className: 'settings-profile' },
    createElement('div', { className: 'settings-profile-avatar' }, createUserIcon()),
    createElement('div', { className: 'settings-profile-copy' },
      usernameElement
    )
  );
}
