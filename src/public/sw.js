// Service worker for the installed app. VANTA only runs against a live
// server, so pages and API answers always go to the network. On top of the
// offline page (a navigation without network gets /offline.html instead of
// the browser's error page) it keeps two small caches that make a restart
// faster:
//
// - the hashed build files under /assets/ (index-…js, page-admin-…css …):
//   a hash names one exact content, so they are served from the cache first.
//   When a page load reports a new build (X-Vanta-Build), the old files go.
// - posters and backdrops with an image tag (/api/media/image/…&tag=…):
//   answered from the cache at once and refreshed in the background
//   (stale-while-revalidate). Logging out empties this cache
//   (js/utils/service-worker.js).
//
// Both are capped, so the installed app stays at a few tens of MB. The
// player, the scenes and everything else under /vendor/ are left to the
// browser's own HTTP cache.
(function (self) {
  var OFFLINE_CACHE = 'vanta-offline-v2';
  var ASSET_CACHE = 'vanta-assets-v1';
  var IMAGE_CACHE = 'vanta-images-v1';
  var META_CACHE = 'vanta-meta-v1';
  var KNOWN_CACHES = [OFFLINE_CACHE, ASSET_CACHE, IMAGE_CACHE, META_CACHE];

  var OFFLINE_URL = '/offline.html';
  var PRECACHE = [OFFLINE_URL, '/js/offline.js', '/assets/logo-vanta.png', '/assets/fonts/outfit-latin.woff2'];

  var MAX_ASSETS = 60;
  var MAX_IMAGES = 200;
  var BUILD_KEY = '/__vanta-build';

  // index-Dk7jyaAZ.js, page-admin-7vIK_cOG.css: Vite's 8-character hash.
  var HASHED_ASSET = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(?:js|css|woff2?|png|jpe?g|webp|svg)$/;
  var IMAGE_PATH = /^\/api\/media\/image\/[^/]+$/;

  self.addEventListener('install', function (event) {
    event.waitUntil(
      caches.open(OFFLINE_CACHE)
        .then(function (cache) { return cache.addAll(PRECACHE); })
        .then(function () { return self.skipWaiting(); })
    );
  });

  self.addEventListener('activate', function (event) {
    event.waitUntil(
      caches.keys()
        .then(function (keys) {
          return Promise.all(keys.filter(function (key) { return KNOWN_CACHES.indexOf(key) === -1; }).map(function (key) { return caches.delete(key); }));
        })
        .then(function () { return self.clients.claim(); })
    );
  });

  function isPrecached(request) {
    var path = new URL(request.url).pathname;
    return request.method === 'GET' && PRECACHE.indexOf(path) !== -1;
  }

  // Oldest entries first (Cache keeps insertion order) until `max` are left.
  function trim(cacheName, max) {
    return caches.open(cacheName).then(function (cache) {
      return cache.keys().then(function (keys) {
        var excess = keys.length - max;
        if (excess <= 0) return undefined;
        return Promise.all(keys.slice(0, excess).map(function (key) { return cache.delete(key); }));
      });
    });
  }

  function cacheable(response) {
    return response && response.ok && response.status === 200 && response.type === 'basic';
  }

  function store(cacheName, max, request, response) {
    return caches.open(cacheName)
      .then(function (cache) { return cache.put(request, response); })
      .then(function () { return trim(cacheName, max); })
      .catch(function () { /* quota or private mode: just not cached */ });
  }

  function cacheFirst(event) {
    var request = event.request;
    return caches.match(request, { cacheName: ASSET_CACHE }).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (cacheable(response)) event.waitUntil(store(ASSET_CACHE, MAX_ASSETS, request, response.clone()));
        return response;
      });
    });
  }

  function staleWhileRevalidate(event) {
    var request = event.request;
    return caches.match(request, { cacheName: IMAGE_CACHE }).then(function (cached) {
      var refresh = fetch(request).then(function (response) {
        // A placeholder answer (no access, not found) is SVG: never cached.
        var type = response.headers && response.headers.get('content-type') || '';
        if (cacheable(response) && type.indexOf('image/svg') !== 0) {
          return store(IMAGE_CACHE, MAX_IMAGES, request, response.clone()).then(function () { return response; });
        }
        return response;
      });
      if (cached) {
        event.waitUntil(refresh.catch(function () {}));
        return cached;
      }
      return refresh;
    });
  }

  // A page load names the deployed build; when it changed, the old hashed
  // files will never be asked for again.
  function rememberBuild(response) {
    var build = response && response.headers && response.headers.get('X-Vanta-Build');
    if (!build) return Promise.resolve();
    return caches.open(META_CACHE).then(function (meta) {
      return meta.match(BUILD_KEY).then(function (stored) {
        return stored ? stored.text() : null;
      }).then(function (previous) {
        if (previous === build) return undefined;
        return meta.put(BUILD_KEY, new Response(build)).then(function () {
          return previous ? caches.delete(ASSET_CACHE) : undefined;
        });
      });
    }).catch(function () {});
  }

  self.addEventListener('fetch', function (event) {
    var request = event.request;
    if (request.method !== 'GET') return;
    var url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    // The offline page's own files (script, logo, font) must come from the
    // cache when the network is gone; otherwise they are fetched as usual.
    if (isPrecached(request)) {
      event.respondWith(
        fetch(request).catch(function () {
          return caches.match(request, { ignoreSearch: true });
        })
      );
      return;
    }

    if (HASHED_ASSET.test(url.pathname)) {
      event.respondWith(cacheFirst(event));
      return;
    }

    if (IMAGE_PATH.test(url.pathname) && url.searchParams.has('tag') && !request.headers.has('range')) {
      event.respondWith(staleWhileRevalidate(event));
      return;
    }

    if (request.mode !== 'navigate') return;

    event.respondWith(
      fetch(request).then(function (response) {
        event.waitUntil(rememberBuild(response));
        return response;
      }).catch(function () {
        return caches.match(OFFLINE_URL).then(function (cached) {
          return cached || new Response('Kein Internet', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        });
      })
    );
  });

  // Web Push (see push.service.js): the payload holds only what the
  // notification shows. A click opens that page in an open VANTA window, or
  // a new one.
  self.addEventListener('push', function (event) {
    var data = {};
    try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
    var title = data.title || 'VANTA';
    var options = {
      body: data.body || '',
      icon: '/assets/logo-vanta.png',
      badge: '/assets/logo-vanta.png',
      tag: data.tag || undefined,
      data: { url: data.url || '/#/home' }
    };
    if (data.image) options.image = data.image;
    event.waitUntil(self.registration.showNotification(title, options));
  });

  self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    var target = new URL((event.notification.data && event.notification.data.url) || '/#/home', self.location.origin);
    if (target.origin !== self.location.origin) target = new URL('/#/home', self.location.origin);
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windows) {
        for (var i = 0; i < windows.length; i++) {
          var client = windows[i];
          if (new URL(client.url).origin !== self.location.origin) continue;
          // The page moves itself (a hash change, no reload).
          client.postMessage({ type: 'vanta:navigate', url: target.pathname + target.search + target.hash });
          return client.focus ? client.focus() : client;
        }
        return self.clients.openWindow(target.href);
      })
    );
  });

  // The browser replaced the subscription: tell the server the new one. Only
  // works while the session cookie is valid; else it renews on the next visit.
  self.addEventListener('pushsubscriptionchange', function (event) {
    var options = event.oldSubscription && event.oldSubscription.options;
    if (!options) return;
    event.waitUntil(
      self.registration.pushManager.subscribe(options).then(function (subscription) {
        return fetch('/api/notifications/subscriptions', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() })
        });
      }).catch(function () {})
    );
  });

})(self);
