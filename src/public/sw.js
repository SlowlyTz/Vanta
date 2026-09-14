// Service worker for the installed app. It caches nothing of the app itself:
// VANTA only runs against a live server, so every load goes to the network.
// The one job here is to answer a page navigation with /offline.html when the
// network is gone, instead of the browser's own error page.
(function (self) {
  var CACHE = 'vanta-offline-v1';
  var OFFLINE_URL = '/offline.html';
  var PRECACHE = [OFFLINE_URL, '/assets/logo-vanta.png', '/assets/fonts/outfit-latin.woff2'];

  self.addEventListener('install', function (event) {
    event.waitUntil(
      caches.open(CACHE)
        .then(function (cache) { return cache.addAll(PRECACHE); })
        .then(function () { return self.skipWaiting(); })
    );
  });

  self.addEventListener('activate', function (event) {
    event.waitUntil(
      caches.keys()
        .then(function (keys) {
          return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) { return caches.delete(key); }));
        })
        .then(function () { return self.clients.claim(); })
    );
  });

  self.addEventListener('fetch', function (event) {
    var request = event.request;
    if (request.mode !== 'navigate') return;

    event.respondWith(
      fetch(request).catch(function () {
        return caches.match(OFFLINE_URL).then(function (cached) {
          return cached || new Response('Kein Internet', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        });
      })
    );
  });
})(self);
