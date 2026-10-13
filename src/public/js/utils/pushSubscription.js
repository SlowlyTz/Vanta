import { NotificationsApi } from '../api/notifications.api.js';

// Push on this device: whether it can work here, and switching it on and
// off. The permission is only ever asked after a click (enablePush).

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches === true || navigator.standalone === true;

// 'ready' | 'denied' | 'unsupported' | 'ios-install' (iOS only pushes to the
// app on the home screen, from 16.4).
export function pushSupport() {
  if (isIos() && !isStandalone()) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'ready';
}

export function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.ready;
}

export async function currentSubscription() {
  if (pushSupport() !== 'ready') return null;
  try {
    return await (await registration()).pushManager.getSubscription();
  } catch {
    return null;
  }
}

// Asks for permission, subscribes and tells the server. Resolves with
// 'on' or the reason it did not work ('denied', 'unsupported', 'ios-install').
export async function enablePush() {
  const support = pushSupport();
  if (support !== 'ready') return support;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const { publicKey } = await NotificationsApi.getPushKey();
  const pushManager = (await registration()).pushManager;
  let subscription = await pushManager.getSubscription();
  if (!subscription) {
    subscription = await pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
  }
  await NotificationsApi.subscribe(subscription.toJSON());
  return 'on';
}

export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await NotificationsApi.unsubscribe(subscription.endpoint).catch(() => {});
  await subscription.unsubscribe().catch(() => {});
}

// The server drops a device's subscription on logout and when another account
// signs in on it, but the browser keeps it. Called when the settings show the
// switch: a subscription the browser still has is registered again, so the
// switch and what actually arrives agree. Resolves with whether push is on.
export async function syncPushSubscription() {
  const subscription = await currentSubscription();
  if (!subscription || Notification.permission !== 'granted') return false;
  try {
    await NotificationsApi.subscribe(subscription.toJSON());
    return true;
  } catch {
    return false;
  }
}

// On logout: the next account on this device starts with push off. Only the
// browser side; the server already forgets the subscription with the session.
export async function unsubscribeBrowserPush() {
  const subscription = await currentSubscription();
  if (!subscription) return false;
  return subscription.unsubscribe().then(() => true, () => false);
}
