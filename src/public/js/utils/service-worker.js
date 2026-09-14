// Registers sw.js, which only provides the offline page for page loads. Kept
// outside the Vite build so the worker URL stays stable across deploys.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register('/sw.js').catch(error => {
    console.warn('[SW] registration failed:', error?.message || error);
    return null;
  });
}
