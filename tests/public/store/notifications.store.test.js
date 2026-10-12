import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/public/js/api/notifications.api.js', () => ({
  NotificationsApi: { getSummary: vi.fn(), markSeen: vi.fn(), getFeed: vi.fn(async () => ({ items: [], unread: 0 })), markRead: vi.fn() }
}));

import { NotificationsApi } from '../../../src/public/js/api/notifications.api.js';
import { notificationsStore } from '../../../src/public/js/store/notifications.store.js';

describe('notificationsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationsStore.stop();
  });

  it('adds up what waits for an admin and tells its subscribers', async () => {
    NotificationsApi.getSummary.mockResolvedValue({ mine: { requests: 1, reports: 0 }, admin: { requests: 2, reports: 1 } });
    const listener = vi.fn();
    notificationsStore.subscribe(listener);

    await notificationsStore.refresh();

    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
      mine: { requests: 1, reports: 0 }, adminTotal: 3, hasAdminWork: true
    }));
  });

  it('clears a dot when its list was opened and hands back the previous visit', async () => {
    NotificationsApi.getSummary.mockResolvedValue({ mine: { requests: 2, reports: 1 }, admin: null });
    NotificationsApi.markSeen.mockResolvedValue({ previousSeenAt: 1234 });
    await notificationsStore.refresh();

    await expect(notificationsStore.markSeen('reports')).resolves.toBe(1234);
    expect(notificationsStore.getState().mine).toEqual({ requests: 2, reports: 0 });
    expect(notificationsStore.getState().adminTotal).toBe(0);
  });
});

describe('notificationsStore feed', () => {
  it('loads the bell list with the summary and marks read', async () => {
    NotificationsApi.getSummary.mockResolvedValue({ mine: { requests: 0, reports: 0 }, admin: null });
    NotificationsApi.getFeed.mockResolvedValue({ items: [{ id: 1, read: false }, { id: 2, read: false }], unread: 2 });
    await notificationsStore.refresh();
    expect(notificationsStore.getState().unread).toBe(2);

    NotificationsApi.markRead.mockResolvedValue({ unread: 1 });
    await notificationsStore.markRead(1);
    expect(notificationsStore.getState().feed.items[0].read).toBe(true);
    expect(notificationsStore.getState().unread).toBe(1);

    NotificationsApi.markRead.mockRejectedValue(new Error('offline'));
    await notificationsStore.markRead();
    expect(notificationsStore.getState().unread).toBe(1);
  });
});

describe('notificationsStore „Alle gelesen“', () => {
  beforeEach(() => notificationsStore.stop());

  it('ignores a feed answer that left before the click and keeps the newest count', async () => {
    NotificationsApi.getSummary.mockResolvedValue({ mine: { requests: 0, reports: 0 }, admin: null });
    NotificationsApi.getFeed.mockResolvedValue({ items: [{ id: 1, read: false }, { id: 2, read: false }], unread: 2 });
    await notificationsStore.refresh();

    let answerFeed;
    NotificationsApi.getFeed.mockReturnValueOnce(new Promise(resolve => { answerFeed = resolve; }));
    const pending = notificationsStore.refresh();
    let answerOne;
    NotificationsApi.markRead.mockReturnValueOnce(new Promise(resolve => { answerOne = resolve; }));
    const one = notificationsStore.markRead(1);
    NotificationsApi.markRead.mockResolvedValueOnce({ unread: 0 });
    await notificationsStore.markRead();

    answerFeed({ items: [{ id: 1, read: false }, { id: 2, read: false }], unread: 2 });
    await pending;
    expect(notificationsStore.getState().unread).toBe(0);
    expect(notificationsStore.getState().feed.items.every(item => item.read)).toBe(true);

    answerOne({ unread: 1 });
    await one;
    expect(notificationsStore.getState().unread).toBe(0);
  });
});
