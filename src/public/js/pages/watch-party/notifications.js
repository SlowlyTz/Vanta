import { createElement } from '../../utils/dom.js';
import { notificationIcon } from './helpers.js';

export function bindNotifications(ctx) {
  ctx.showWatchPartyNotification = notification => {
    if (!notification || typeof notification !== 'object') return;

    const item = createElement('div', {
      className: `watch-party-notification is-${notification.type || 'default'}`
    },
      createElement('span', {
        className: 'watch-party-notification-icon',
        'aria-hidden': 'true'
      }, notificationIcon(notification.icon || notification.type)),
      createElement('span', {
        className: 'watch-party-notification-text'
      }, notification.message || 'Watch Party aktualisiert.')
    );

    ctx.notificationStack.appendChild(item);
    window.setTimeout(() => item.classList.add('is-leaving'), 4200);
    window.setTimeout(() => item.remove(), 4800);
  };

  return ctx;
}
