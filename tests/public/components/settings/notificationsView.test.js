import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/public/js/api/notifications.api.js', () => ({
  NotificationsApi: {
    getPreferences: vi.fn(async () => ({ kinds: [{ kind: 'announcement', push: true, inApp: true }] })),
    savePreferences: vi.fn()
  }
}));
vi.mock('../../../../src/public/js/store/app.store.js', () => ({ appStore: { showToast: vi.fn() } }));
vi.mock('../../../../src/public/js/utils/pushSubscription.js', () => ({
  pushSupport: () => 'ready',
  enablePush: vi.fn(),
  disablePush: vi.fn(),
  syncPushSubscription: vi.fn(async () => true)
}));

import { syncPushSubscription } from '../../../../src/public/js/utils/pushSubscription.js';
import { createNotificationsView } from '../../../../src/public/js/components/settings/views/notificationsView.js';

describe('notifications view', () => {
  it('re-registers the kept subscription and names every switch by its kind', async () => {
    const onStatus = vi.fn();
    const view = createNotificationsView({ onStatus });
    await view.refresh();
    expect(syncPushSubscription).toHaveBeenCalled();
    expect(onStatus).toHaveBeenLastCalledWith('An');
    const labels = [...view.element.querySelectorAll('.settings-kind-row:not(.settings-kind-head) input')].map(input => input.getAttribute('aria-label'));
    expect(labels).toEqual(['Mitteilungen: in der App', 'Mitteilungen: Push']);
    // The columns say what each switch is; the old note is gone.
    expect(view.element.querySelector('.settings-kind-head').textContent).toBe('In der AppPush');
    expect(view.element.textContent).not.toContain('„Liste“ ist die Glocke');
  });
});
