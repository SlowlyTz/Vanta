import { createElement } from '../utils/dom.js';
import { notificationsStore } from '../store/notifications.store.js';
import { openModal } from '../utils/modal.js';
import { bindSheetSwipe } from '../utils/sheetSwipe.js';

const SHEET_QUERY = '(max-width: 600px)';

const BELL_ICON = '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

const KIND_ICONS = {
  request_update: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  request_available: '<path d="M8 5v14l11-7z"/>',
  report_update: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  new_episode: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  new_content: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',
  watch_party_invite: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M19 8v6M16 11h6"/>',
  app_update: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  admin_new_request: '<path d="M12 2l9 4v6c0 5-3.8 9.3-9 10-5.2-.7-9-5-9-10V6z"/>',
  announcement: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M19 6a8 8 0 0 1 0 12"/>'
};

const kindIcon = kind => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${KIND_ICONS[kind] || KIND_ICONS.new_content}</svg>`;

// "gerade eben", "vor 5 Min.", "vor 3 Std.", "gestern", then the date.
export function formatAge(timestamp, now = Date.now()) {
  const minutes = Math.floor((now - timestamp) / 60_000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  if (hours < 48) return 'gestern';
  return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' }).format(new Date(timestamp));
}

// The bell in the navbar: the number of unread notifications, and on a click
// the last 50 of them. A click on one marks it read and opens its page.
export function createNotificationBell() {
  const count = createElement('span', { className: 'notification-bell-count', 'aria-hidden': 'true' });
  const button = createElement('button', {
    type: 'button',
    className: 'navbar-action-button navbar-action-bell',
    'aria-label': 'Benachrichtigungen',
    'aria-haspopup': 'dialog'
  });
  button.innerHTML = `<span class="navbar-action-icon">${BELL_ICON}</span>`;
  button.appendChild(count);

  let handle = null;

  const renderCount = ({ unread }) => {
    count.textContent = unread > 0 ? (unread > 99 ? '99+' : String(unread)) : '';
    button.setAttribute('aria-label', unread > 0 ? `Benachrichtigungen, ${unread} ungelesen` : 'Benachrichtigungen');
  };

  const open = () => {
    const sheet = window.matchMedia?.(SHEET_QUERY).matches === true;
    const list = createElement('div', { className: 'notification-panel-list', role: 'list' });
    const readAll = createElement('button', {
      type: 'button',
      className: 'notification-panel-read-all',
      onClick: () => notificationsStore.markRead()
    }, 'Alle gelesen');
    const panel = createElement('div', { className: `notification-panel${sheet ? ' is-sheet' : ''}`, 'aria-labelledby': 'notification-panel-title' },
      sheet ? createElement('span', { className: 'media-actions-grip', 'aria-hidden': 'true' }) : null,
      createElement('div', { className: 'notification-panel-head' },
        createElement('h2', { id: 'notification-panel-title' }, 'Benachrichtigungen'),
        readAll
      ),
      list
    );
    const overlay = createElement('div', { className: `notification-panel-backdrop${sheet ? '' : ' is-clear'}` }, panel);

    const render = ({ feed }) => {
      readAll.disabled = !feed.items.some(item => !item.read);
      if (!feed.loaded) {
        list.replaceChildren(createElement('p', { className: 'notification-panel-empty' }, 'Wird geladen …'));
        return;
      }
      if (feed.items.length === 0) {
        list.replaceChildren(createElement('p', { className: 'notification-panel-empty' }, 'Noch keine Benachrichtigungen. Was du bekommst, stellst du in den Einstellungen ein.'));
        return;
      }
      list.replaceChildren(...feed.items.map(item => {
        const entry = createElement('button', {
          type: 'button',
          className: `notification-entry${item.read ? '' : ' is-unread'}`,
          onClick: () => {
            if (!item.read) notificationsStore.markRead(item.id);
            handle?.close();
            const hash = item.url?.includes('#') ? item.url.slice(item.url.indexOf('#')) : null;
            if (hash?.startsWith('#/')) window.location.hash = hash;
          }
        });
        entry.innerHTML = `<span class="notification-entry-icon">${kindIcon(item.kind)}</span><span class="notification-entry-text"><strong></strong><span></span><time></time></span>`;
        entry.querySelector('strong').textContent = item.title;
        entry.querySelector('.notification-entry-text > span').textContent = item.body;
        const time = entry.querySelector('time');
        time.dateTime = new Date(item.createdAt).toISOString();
        time.textContent = formatAge(item.createdAt);
        // The list item holds the button: a button with role="listitem"
        // would no longer be announced as a button.
        return createElement('div', { className: 'notification-entry-item', role: 'listitem' }, entry);
      }));
    };

    if (!sheet) {
      const rect = button.getBoundingClientRect();
      Object.assign(panel.style, { top: `${Math.round(rect.bottom + 8)}px`, right: `${Math.max(8, Math.round(window.innerWidth - rect.right))}px` });
    }

    const unsubscribe = notificationsStore.subscribe(render);
    let unbindSwipe = null;
    handle = openModal({
      overlay,
      dialog: panel,
      lockScroll: sheet,
      onClose: () => {
        unsubscribe();
        unbindSwipe?.();
        button.setAttribute('aria-expanded', 'false');
        handle = null;
      }
    });
    if (sheet) unbindSwipe = bindSheetSwipe({ sheet: panel, backdrop: overlay, onDismiss: () => handle?.close() });
    button.setAttribute('aria-expanded', 'true');
    notificationsStore.refresh();
  };

  button.addEventListener('click', event => {
    event.stopPropagation();
    if (handle) handle.close();
    else open();
  });

  notificationsStore.subscribe(renderCount);
  return { element: button, open, close: () => handle?.close() };
}
