import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/public/js/api/notifications.api.js', () => ({
  NotificationsApi: { subscribe: vi.fn(async () => ({})), unsubscribe: vi.fn(async () => ({})), getPushKey: vi.fn() }
}));

import { NotificationsApi } from '../../../src/public/js/api/notifications.api.js';
import { syncPushSubscription, unsubscribeBrowserPush } from '../../../src/public/js/utils/pushSubscription.js';

let subscription;
const originals = {};

beforeEach(() => {
  vi.clearAllMocks();
  subscription = { endpoint: 'https://push.example/1', toJSON: () => ({ endpoint: 'https://push.example/1' }), unsubscribe: vi.fn(async () => true) };
  originals.serviceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => subscription } }) }
  });
  window.PushManager = function PushManager() {};
  globalThis.Notification = { permission: 'granted' };
});

afterEach(() => {
  if (originals.serviceWorker) Object.defineProperty(navigator, 'serviceWorker', originals.serviceWorker);
  else delete navigator.serviceWorker;
  delete window.PushManager;
  delete globalThis.Notification;
});

describe('push subscription', () => {
  it('registers a subscription the browser kept with the server again', async () => {
    await expect(syncPushSubscription()).resolves.toBe(true);
    expect(NotificationsApi.subscribe).toHaveBeenCalledWith({ endpoint: 'https://push.example/1' });
  });

  it('reports push as off when the server does not take it', async () => {
    NotificationsApi.subscribe.mockRejectedValueOnce(new Error('offline'));
    await expect(syncPushSubscription()).resolves.toBe(false);
  });

  it('is off without a subscription', async () => {
    subscription = null;
    await expect(syncPushSubscription()).resolves.toBe(false);
    expect(NotificationsApi.subscribe).not.toHaveBeenCalled();
  });

  it('drops the browser subscription on logout without asking the server', async () => {
    await expect(unsubscribeBrowserPush()).resolves.toBe(true);
    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(NotificationsApi.unsubscribe).not.toHaveBeenCalled();
  });
});
