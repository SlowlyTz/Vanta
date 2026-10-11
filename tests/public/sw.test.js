import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/public/sw.js'), 'utf8');

// A tiny Cache Storage: named caches holding url -> response, in insertion order.
function createCaches(initialNames = []) {
  const stores = new Map(initialNames.map(name => [name, new Map()]));
  const keyOf = request => (typeof request === 'string' ? request : request.url);
  const cacheFor = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      addAll: vi.fn(async urls => urls.forEach(url => entries.set(url, { url }))),
      put: vi.fn(async (request, response) => { entries.set(keyOf(request), response); }),
      match: vi.fn(async request => entries.get(keyOf(request))),
      keys: vi.fn(async () => [...entries.keys()].map(url => ({ url }))),
      delete: vi.fn(async request => entries.delete(keyOf(request)))
    };
  };
  return {
    stores,
    open: vi.fn(async name => cacheFor(name)),
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async name => stores.delete(name)),
    match: vi.fn(async (request, { cacheName, ignoreSearch } = {}) => {
      const names = cacheName ? [cacheName] : [...stores.keys()];
      for (const name of names) {
        const key = keyOf(request);
        const found = stores.get(name)?.get(ignoreSearch ? key.split('?')[0].replace('http://localhost', '') : key)
          ?? stores.get(name)?.get(key.replace('http://localhost', ''));
        if (found) return found;
      }
      return undefined;
    })
  };
}

class FakeResponse {
  constructor(body = '', init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.type = init.type ?? 'basic';
    this.headers = new Headers(init.headers || {});
  }
  clone() { return new FakeResponse(this.body, { status: this.status, type: this.type, headers: this.headers }); }
  async text() { return String(this.body); }
}

function loadWorker(cacheNames) {
  const listeners = {};
  const caches = createCaches(cacheNames);
  const self = {
    location: { origin: 'http://localhost' },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: { claim: vi.fn().mockResolvedValue(undefined) }
  };
  const fetch = vi.fn();
  new Function('self', 'caches', 'fetch', 'Response', 'URL', source)(self, caches, fetch, FakeResponse, URL);
  return { listeners, caches, self, fetch };
}

const request = (url, { mode = 'cors', method = 'GET', headers = {} } = {}) => ({
  url: url.startsWith('http') ? url : `http://localhost${url}`, mode, method, headers: new Headers(headers)
});

// Runs a fetch event; resolves with what respondWith got (or null) after
// every waitUntil job has finished.
async function dispatchFetch(worker, req) {
  let responded = null;
  const jobs = [];
  worker.listeners.fetch({ request: req, respondWith: p => { responded = p; }, waitUntil: p => jobs.push(p) });
  const response = responded ? await responded : null;
  await Promise.all(jobs);
  await Promise.all(jobs);
  return response;
}

describe('sw.js', () => {
  let worker;

  beforeEach(() => {
    worker = loadWorker(['vanta-offline-v1', 'vanta-offline-v2', 'vanta-assets-v1']);
  });

  it('precaches only the offline page and its assets', async () => {
    let done;
    worker.listeners.install({ waitUntil: promise => { done = promise; } });
    await done;
    expect([...worker.caches.stores.get('vanta-offline-v2').keys()]).toEqual(['/offline.html', '/js/offline.js', '/assets/logo-vanta.png', '/assets/fonts/outfit-latin.woff2']);
    expect(worker.self.skipWaiting).toHaveBeenCalled();
  });

  it('drops caches it does not know on activate', async () => {
    let done;
    worker.listeners.activate({ waitUntil: promise => { done = promise; } });
    await done;
    expect(worker.caches.delete).toHaveBeenCalledWith('vanta-offline-v1');
    expect(worker.caches.delete).not.toHaveBeenCalledWith('vanta-offline-v2');
    expect(worker.caches.delete).not.toHaveBeenCalledWith('vanta-assets-v1');
    expect(worker.self.clients.claim).toHaveBeenCalled();
  });

  it('leaves API calls, the player and other origins to the network', async () => {
    for (const url of ['/api/media/home', '/vendor/player/vanta-player.js', '/api/media/image/abc?type=Primary', 'https://example.com/x.js']) {
      expect(await dispatchFetch(worker, request(url))).toBeNull();
    }
    expect(await dispatchFetch(worker, request('/api/requests', { method: 'POST' }))).toBeNull();
  });

  it('serves the offline page assets from the cache when the network fails', async () => {
    const cached = { cached: true };
    worker.caches.stores.get('vanta-offline-v2').set('/js/offline.js', cached);
    worker.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await dispatchFetch(worker, request('/js/offline.js', { mode: 'no-cors' }))).toBe(cached);
  });

  it('passes a navigation through and falls back to offline.html when it fails', async () => {
    const online = new FakeResponse('<html>');
    worker.fetch.mockResolvedValueOnce(online);
    expect(await dispatchFetch(worker, request('/', { mode: 'navigate' }))).toBe(online);

    const offlinePage = { offline: true };
    worker.caches.stores.get('vanta-offline-v2').set('/offline.html', offlinePage);
    worker.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await dispatchFetch(worker, request('/', { mode: 'navigate' }))).toBe(offlinePage);
  });

  it('serves hashed build files from the cache first and keeps only the newest ones', async () => {
    worker.fetch.mockImplementation(async () => new FakeResponse('js'));
    const first = await dispatchFetch(worker, request('/assets/index-Dk7jyaAZ.js'));
    expect(first.body).toBe('js');
    expect(worker.fetch).toHaveBeenCalledTimes(1);

    const again = await dispatchFetch(worker, request('/assets/index-Dk7jyaAZ.js'));
    expect(again.body).toBe('js');
    expect(worker.fetch).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 65; i++) await dispatchFetch(worker, request(`/assets/chunk${i}-AbCdEf${String(i).padStart(2, '0')}.js`));
    expect(worker.caches.stores.get('vanta-assets-v1').size).toBe(60);
    expect(worker.caches.stores.get('vanta-assets-v1').has('http://localhost/assets/index-Dk7jyaAZ.js')).toBe(false);
  });

  it('answers tagged posters from the cache and refreshes them in the background', async () => {
    const url = '/api/media/image/abc?type=Primary&tag=t1&maxWidth=400';
    worker.fetch.mockResolvedValueOnce(new FakeResponse('v1', { headers: { 'content-type': 'image/webp' } }));
    expect((await dispatchFetch(worker, request(url))).body).toBe('v1');

    worker.fetch.mockResolvedValueOnce(new FakeResponse('v2', { headers: { 'content-type': 'image/webp' } }));
    expect((await dispatchFetch(worker, request(url))).body).toBe('v1');
    expect(worker.fetch).toHaveBeenCalledTimes(2);
    expect((await worker.caches.stores.get('vanta-images-v1').get(`http://localhost${url}`)).body).toBe('v2');
  });

  it('never keeps a placeholder', async () => {
    const url = '/api/media/image/hidden?type=Primary&tag=t1';
    worker.fetch.mockResolvedValue(new FakeResponse('<svg/>', { headers: { 'content-type': 'image/svg+xml; charset=utf-8' } }));
    await dispatchFetch(worker, request(url));
    expect(worker.caches.stores.get('vanta-images-v1')?.size ?? 0).toBe(0);
  });

  it('drops the cached build files once a page load reports another build', async () => {
    worker.caches.stores.get('vanta-assets-v1').set('http://localhost/assets/index-Old00000.js', new FakeResponse('old'));

    worker.fetch.mockResolvedValueOnce(new FakeResponse('<html>', { headers: { 'X-Vanta-Build': 'build-a' } }));
    await dispatchFetch(worker, request('/', { mode: 'navigate' }));
    expect(worker.caches.stores.has('vanta-assets-v1')).toBe(true);

    worker.fetch.mockResolvedValueOnce(new FakeResponse('<html>', { headers: { 'X-Vanta-Build': 'build-b' } }));
    await dispatchFetch(worker, request('/', { mode: 'navigate' }));
    expect(worker.caches.stores.has('vanta-assets-v1')).toBe(false);
  });
});
