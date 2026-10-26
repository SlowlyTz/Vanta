// Account header of the settings dialog: an avatar with the initial, the name and the role.
import { createElement } from '../../utils/dom.js';

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
