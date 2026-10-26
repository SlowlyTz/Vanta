import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/public/js/api/sessions.api.js', () => ({
  SessionsApi: { list: vi.fn(), end: vi.fn(async () => ({})), endOthers: vi.fn(async () => ({ ended: 2 })) }
}));
vi.mock('../../../../src/public/js/store/app.store.js', () => ({ appStore: { showToast: vi.fn() } }));
vi.mock('../../../../src/public/js/components/confirmDialog.js', () => ({ confirmDialog: vi.fn() }));

import { SessionsApi } from '../../../../src/public/js/api/sessions.api.js';
import { confirmDialog } from '../../../../src/public/js/components/confirmDialog.js';
import { createDevicesView, orderSessions } from '../../../../src/public/js/components/settings/views/devicesView.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const session = (id, extra = {}) => ({ id, userAgent: 'Mozilla/5.0', loginAt: id * 1000, ...extra });

describe('devices view', () => {
  beforeEach(() => vi.clearAllMocks());

  it('puts this device first and the others by last activity', () => {
    const { current, others } = orderSessions([
      session(1, { lastSeenAt: 50_000 }), session(2, { current: true }), session(3), session(4, { lastSeenAt: 90_000 })
    ]);
    expect(current.map(s => s.id)).toEqual([2]);
    expect(others.map(s => s.id)).toEqual([4, 1, 3]);
  });

  it('shows five other devices and the rest on request', async () => {
    SessionsApi.list.mockResolvedValue({ sessions: [session(0, { current: true }), ...[1, 2, 3, 4, 5, 6, 7].map(id => session(id))] });
    const view = createDevicesView();
    await view.refresh();
    expect(view.element.querySelectorAll('.settings-device-row')).toHaveLength(6);
    const more = [...view.element.querySelectorAll('button')].find(button => button.textContent === '2 weitere anzeigen');
    more.click();
    expect(view.element.querySelectorAll('.settings-device-row')).toHaveLength(8);
  });

  it('asks before signing a device or all others out', async () => {
    SessionsApi.list.mockResolvedValue({ sessions: [session(0, { current: true }), session(1), session(2)] });
    const view = createDevicesView();
    await view.refresh();
    const button = label => [...view.element.querySelectorAll('button')].find(b => b.textContent === label);

    confirmDialog.mockResolvedValueOnce(false);
    button('Abmelden').click();
    await flush();
    expect(SessionsApi.end).not.toHaveBeenCalled();

    confirmDialog.mockResolvedValueOnce(true);
    button('Abmelden').click();
    await flush();
    expect(SessionsApi.end).toHaveBeenCalledWith(2);

    confirmDialog.mockResolvedValueOnce(true);
    button('Alle anderen abmelden').click();
    await flush();
    expect(confirmDialog).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Alle anderen Geräte abmelden?' }));
    expect(SessionsApi.endOthers).toHaveBeenCalled();
  });
});
