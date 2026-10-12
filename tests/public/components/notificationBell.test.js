import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../../src/public/js/api/notifications.api.js', () => ({
  NotificationsApi: {
    getSummary: vi.fn(async () => ({ mine: { requests: 0, reports: 0 }, admin: null })),
    getFeed: vi.fn(async () => ({
      items: [{ id: 1, kind: 'announcement', title: 'Wartung', body: 'Heute Abend', createdAt: Date.now(), read: false }],
      unread: 1
    })),
    markRead: vi.fn(async () => ({ unread: 0 }))
  }
}));

import { createNotificationBell } from '../../../src/public/js/components/notificationBell.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('notification bell', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('lists entries as list items holding a real button, with a megaphone for announcements', async () => {
    const bell = createNotificationBell();
    document.body.appendChild(bell.element);
    bell.open();
    await flush();
    const item = document.querySelector('.notification-panel-list > [role="listitem"]');
    expect(item).toBeTruthy();
    const button = item.querySelector('button.notification-entry');
    expect(button.getAttribute('role')).toBeNull();
    expect(button.textContent).toContain('Wartung');
    // Not the star fallback of new_content.
    expect(button.querySelector('.notification-entry-icon svg').innerHTML).toContain('M3 11v2');
    bell.close();
  });
});
