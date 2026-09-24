import { createElement } from '../../utils/dom.js';
import { memberInitial, notificationIcon } from './helpers.js';
import { memberHue } from './lobby/roster.js';

export const NOTIFICATION_VISIBLE_MS = 4_200;
const NOTIFICATION_LEAVE_MS = 400;
export const MAX_VISIBLE_NOTIFICATIONS = 3;

// "Lena hat pausiert." → the name in bold, the rest plain.
function messageContent(message, actor) {
  const name = actor?.username;
  if (!name || !message.startsWith(name)) return [message];
  return [createElement('strong', {}, name), message.slice(name.length)];
}

export function bindNotifications(ctx) {
  const dismiss = item => {
    if (item.classList.contains('is-leaving')) return;
    item.classList.add('is-leaving');
    window.setTimeout(() => item.remove(), NOTIFICATION_LEAVE_MS);
  };

  ctx.showWatchPartyNotification = notification => {
    if (!notification || typeof notification !== 'object') return;
    const actor = notification.actor || null;
    const type = notification.type || 'default';

    const avatar = actor
      ? createElement('span', { className: 'watch-party-notification-avatar', 'aria-hidden': 'true' }, memberInitial(actor.username))
      : createElement('span', { className: 'watch-party-notification-avatar is-system', 'aria-hidden': 'true' });
    if (actor) avatar.style.setProperty('--member-hue', String(memberHue(actor.userId || actor.username)));
    avatar.appendChild(createElement('span', {
      className: 'watch-party-notification-icon',
      'aria-hidden': 'true'
    }, notificationIcon(notification.icon || notification.type)));

    const item = createElement('div', { className: `watch-party-notification is-${type}` },
      avatar,
      createElement('span', { className: 'watch-party-notification-text' },
        ...messageContent(notification.message || 'Watch Party aktualisiert.', actor)
      )
    );

    ctx.notificationStack.appendChild(item);
    // The oldest cards make room once more than a few are up.
    const active = [...ctx.notificationStack.querySelectorAll('.watch-party-notification:not(.is-leaving)')];
    active.slice(0, Math.max(0, active.length - MAX_VISIBLE_NOTIFICATIONS)).forEach(dismiss);

    window.setTimeout(() => dismiss(item), NOTIFICATION_VISIBLE_MS);
  };

  return ctx;
}
