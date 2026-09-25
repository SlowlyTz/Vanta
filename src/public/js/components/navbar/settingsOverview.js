import { createElement } from '../../utils/dom.js';
import { createMovieIcon, createScreenIcon, createPlayOutlineIcon } from './icons.js';

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
    valueElement,
    createElement('span', { className: 'settings-stat-label' }, label)
  );
}

// The account header: an avatar with the initial, the name and the role.
export function createSettingsProfile(usernameElement) {
  const avatar = createElement('span', { className: 'settings-profile-avatar', 'aria-hidden': 'true' }, '?');
  const role = createElement('span', { className: 'settings-profile-role' }, 'Mitglied');

  const element = createElement('div', { className: 'settings-profile' },
    avatar,
    createElement('div', { className: 'settings-profile-copy' }, usernameElement, role)
  );

  const setName = name => {
    usernameElement.textContent = name || 'Username';
    avatar.textContent = (String(name || '').trim().charAt(0) || '?').toUpperCase();
  };

  const setAdmin = isAdmin => {
    role.textContent = isAdmin ? 'Administrator' : 'Mitglied';
  };

  return { element, setName, setAdmin };
}
