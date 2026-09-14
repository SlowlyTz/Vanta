import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/public/sw.js'), 'utf8');

function loadWorker() {
  const listeners = {};
  const cache = { addAll: vi.fn().mockResolvedValue(undefined) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue(['vanta-offline-v1', 'vanta-offline-v2']),
    delete: vi.fn().mockResolvedValue(true),
    match: vi.fn()
  };
  const self = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: { claim: vi.fn().mockResolvedValue(undefined) }
  };
  const fetch = vi.fn();
  new Function('self', 'caches', 'fetch', 'Response', source)(self, caches, fetch, class { constructor(body, init) { this.body = body; this.status = init?.status; } });
  return { listeners, cache, caches, self, fetch };
}

describe('sw.js', () => {
  let worker;

  beforeEach(() => {
    worker = loadWorker();
  });

  it('precaches only the offline page and its assets', async () => {
    let done;
    worker.listeners.install({ waitUntil: promise => { done = promise; } });
    await done;
    expect(worker.cache.addAll).toHaveBeenCalledWith(['/offline.html', '/js/offline.js', '/assets/logo-vanta.png', '/assets/fonts/outfit-latin.woff2']);
    expect(worker.self.skipWaiting).toHaveBeenCalled();
  });

  it('drops old caches on activate', async () => {
    let done;
    worker.listeners.activate({ waitUntil: promise => { done = promise; } });
    await done;
    expect(worker.caches.delete).toHaveBeenCalledWith('vanta-offline-v1');
    expect(worker.caches.delete).not.toHaveBeenCalledWith('vanta-offline-v2');
    expect(worker.self.clients.claim).toHaveBeenCalled();
  });

  it('leaves non-navigation requests to the network', () => {
    const respondWith = vi.fn();
    worker.listeners.fetch({ request: { mode: 'cors', method: 'GET', url: 'http://localhost/api/x' }, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });

  it('serves the offline page assets from the cache when the network fails', async () => {
    const cached = { cached: true };
    worker.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    worker.caches.match.mockResolvedValueOnce(cached);
    let result;
    const request = { mode: 'no-cors', method: 'GET', url: 'http://localhost/js/offline.js' };
    worker.listeners.fetch({ request, respondWith: p => { result = p; } });
    expect(await result).toBe(cached);
    expect(worker.caches.match).toHaveBeenCalledWith(request, { ignoreSearch: true });
  });

  it('passes a navigation through and falls back to offline.html when it fails', async () => {
    const online = { ok: true };
    worker.fetch.mockResolvedValueOnce(online);
    let result;
    worker.listeners.fetch({ request: { mode: 'navigate', method: 'GET', url: 'http://localhost/' }, respondWith: p => { result = p; } });
    expect(await result).toBe(online);

    const offlinePage = { cached: true };
    worker.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    worker.caches.match.mockResolvedValueOnce(offlinePage);
    worker.listeners.fetch({ request: { mode: 'navigate', method: 'GET', url: 'http://localhost/' }, respondWith: p => { result = p; } });
    expect(await result).toBe(offlinePage);
    expect(worker.caches.match).toHaveBeenCalledWith('/offline.html');
  });
});
