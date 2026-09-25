import { createElement } from '../../../utils/dom.js';
import { createChevronIcon } from '../../navbar/icons.js';

export const userInitial = name => (String(name || '').trim().charAt(0) || '?').toUpperCase();

export function createUserBadges(user) {
  const badges = createElement('div', { className: 'admin-user-badges' });
  if (user.isAdmin) {
    badges.appendChild(createElement('span', { className: 'admin-user-badge admin-user-badge-admin' }, 'Admin'));
  }
  if (user.isBanned) {
    badges.appendChild(createElement('span', { className: 'admin-user-badge admin-user-badge-banned' }, 'Gesperrt'));
  }
  if (user.isDisabled) {
    badges.appendChild(createElement('span', { className: 'admin-user-badge admin-user-badge-disabled' }, 'Deaktiviert'));
  }
  return badges;
}

// Eine Zeile der Nutzerliste. Die ganze Zeile öffnet die Detailansicht;
// Sperren und Löschen liegen dort, damit die Liste auch am Handy ruhig bleibt.
export function createAdminUserRow(user, { onEdit } = {}) {
  const streamInfo = createElement('span', { className: 'admin-user-stream-info' },
    `${user.activeStreams}/${user.maxConcurrentStreams} Streams`);

  const summary = createElement('button', {
    className: 'admin-user-row-summary',
    type: 'button',
    'aria-label': `${user.name} bearbeiten`,
    onClick: () => onEdit?.(user)
  },
    createElement('span', { className: 'admin-user-avatar', 'aria-hidden': 'true' }, userInitial(user.name)),
    createElement('span', { className: 'admin-user-row-main' },
      createElement('span', { className: 'admin-user-row-title' },
        createElement('span', { className: 'admin-user-row-name' }, user.name),
        createUserBadges(user)
      ),
      streamInfo
    ),
    createElement('span', { className: 'admin-user-row-chevron', 'aria-hidden': 'true' }, createChevronIcon())
  );

  return createElement('div', {
    className: `admin-user-row${user.isBanned ? ' is-banned' : ''}${user.isDisabled ? ' is-disabled' : ''}`
  }, summary);
}
