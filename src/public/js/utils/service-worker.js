// Registers sw.js (offline page, cached build files and posters). Kept
// outside the Vite build so the worker URL stays stable across deploys.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  // A click on a push notification while VANTA is open: go to its page.
  navigator.serviceWorker.addEventListener?.('message', event => {
    if (event.data?.type !== 'vanta:navigate' || typeof event.data.url !== 'string') return;
    const hash = event.data.url.includes('#') ? event.data.url.slice(event.data.url.indexOf('#')) : '#/home';
    if (hash.startsWith('#/')) window.location.hash = hash;
  });
  return navigator.serviceWorker.register('/sw.js').catch(error => {
    console.warn('[SW] registration failed:', error?.message || error);
    return null;
  });
}

// The posters the worker keeps belong to the account that saw them; another
// account on this device starts without them.
export const USER_IMAGE_CACHE = 'vanta-images-v1';

export function clearUserCaches() {
  try {
    return globalThis.caches?.delete(USER_IMAGE_CACHE).catch(() => false) ?? Promise.resolve(false);
  } catch {
    return Promise.resolve(false);
  }
}
