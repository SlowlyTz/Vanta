import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/public/js/api/notifications.api.js', () => ({
  NotificationsApi: { getSummary: vi.fn(), markSeen: vi.fn() }
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
