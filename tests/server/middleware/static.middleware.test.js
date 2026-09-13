import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const PLAYER_DIR = path.resolve('src/public/vendor/player');
const HASHED_CHUNK = fs.readdirSync(PLAYER_DIR).find(name => /-[A-Za-z0-9_-]{8}\.js$/.test(name));

async function loadModules({ nodeEnv, distExists = true } = {}) {
  vi.resetModules();
  vi.doMock('../../../src/server/config/env.js', () => ({ default: { NODE_ENV: nodeEnv } }));
  vi.doMock('fs', async importOriginal => {
    const actual = await importOriginal();
    return { ...actual, default: { ...actual.default, existsSync: () => distExists } };
  });
  const config = await import('../../../src/server/config/static.js');
  const middleware = await import('../../../src/server/middleware/static.middleware.js');
  const pageRoutes = (await import('../../../src/server/routes/page.routes.js')).default;
  return { ...config, ...middleware, pageRoutes };
}

function createApp({ compressResponses, staticAssets, pageRoutes }) {
  const app = express();
  app.use(compressResponses);
  app.use(staticAssets);
  app.get('/api/media/image/:id', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send('<svg>' + 'x'.repeat(4096) + '</svg>');
  });
  app.get('/api/media/library', (req, res) => res.json({ items: 'x'.repeat(4096) }));
  app.use('/', pageRoutes);
  return app;
}

describe('Static asset delivery', () => {
  beforeEach(() => vi.doUnmock('fs'));

  describe('cache policy', () => {
    it('revalidates the shell and unhashed files, keeps hashed chunks and images', async () => {
      const { cacheControlFor } = await loadModules({ nodeEnv: 'development' });

      expect(cacheControlFor('index.html')).toBe('no-cache');
      expect(cacheControlFor('js/app.js')).toBe('no-cache');
      expect(cacheControlFor('css/components/settings/settings-overview.css')).toBe('no-cache');
      expect(cacheControlFor('vendor/player/vanta-player.js')).toBe('no-cache');
      expect(cacheControlFor('vendor/intro/vanta-intro.js')).toBe('no-cache');
      expect(cacheControlFor('vendor/player/provider-B5sjnEci.js')).toBe('public, max-age=31536000, immutable');
      expect(cacheControlFor('assets/logo-vanta.png')).toBe('public, max-age=86400');
      expect(cacheControlFor('assets/fonts/outfit-latin.woff2')).toBe('public, max-age=86400');
    });

    it('treats every file of the Vite build as hashed except its index.html', async () => {
      const { cacheControlFor } = await loadModules({ nodeEnv: 'development' });

      expect(cacheControlFor('index.html', { hashedDir: true })).toBe('no-cache');
      expect(cacheControlFor('assets/index-BFWgCkam.js', { hashedDir: true })).toBe('public, max-age=31536000, immutable');
      expect(cacheControlFor('assets/outfit-latin-Bc-8i84L.woff2', { hashedDir: true })).toBe('public, max-age=31536000, immutable');
    });
  });

  describe('development serving', () => {
    it('serves src/public only and the unbuilt index.html', async () => {
      const modules = await loadModules({ nodeEnv: 'development', distExists: false });

      expect(modules.SERVE_DIST).toBe(false);
      expect(modules.staticAssets).toHaveLength(1);
      expect(modules.INDEX_FILE).toBe(path.resolve('src/public/index.html'));
    });

    it('sends the shell with no-cache and an ETag on / and /index.html', async () => {
      const app = createApp(await loadModules({ nodeEnv: 'development' }));

      for (const url of ['/', '/index.html', '/some/deep/link']) {
        const res = await request(app).get(url);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/html/);
        expect(res.headers['cache-control']).toBe('no-cache');
        expect(res.headers.etag).toBeDefined();
        expect(res.text).toContain('<div id="app"></div>');
      }
    });

    it('sets the cache headers per file class', async () => {
      const app = createApp(await loadModules({ nodeEnv: 'development' }));

      expect((await request(app).get('/vendor/intro/vanta-intro.js')).headers['cache-control']).toBe('no-cache');
      expect((await request(app).get(`/vendor/player/${HASHED_CHUNK}`)).headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect((await request(app).get('/assets/logo-vanta.png')).headers['cache-control']).toBe('public, max-age=86400');
      expect((await request(app).get('/css/base.css')).headers['cache-control']).toBe('no-cache');
    });

    it('answers a conditional request for an unchanged file with 304', async () => {
      const app = createApp(await loadModules({ nodeEnv: 'development' }));
      const first = await request(app).get('/js/app.js');

      const res = await request(app).get('/js/app.js').set('If-None-Match', first.headers.etag);
      expect(res.status).toBe(304);
    });
  });

  describe('compression', () => {
    it('gzips scripts, stylesheets, the shell and JSON when the client accepts gzip', async () => {
      const app = createApp(await loadModules({ nodeEnv: 'development' }));

      for (const url of ['/js/app.js', '/css/base.css', '/', '/api/media/library']) {
        const res = await request(app).get(url).set('Accept-Encoding', 'gzip');
        expect(res.status).toBe(200);
        expect(res.headers['content-encoding']).toBe('gzip');
        expect(res.headers.vary).toMatch(/Accept-Encoding/);
      }
    });

    it('leaves fonts, images and the media proxies uncompressed', async () => {
      const app = createApp(await loadModules({ nodeEnv: 'development' }));

      for (const url of ['/assets/fonts/outfit-latin.woff2', '/assets/logo-vanta.png', '/api/media/image/abc']) {
        const res = await request(app).get(url).set('Accept-Encoding', 'gzip');
        expect(res.status).toBe(200);
        expect(res.headers['content-encoding']).toBeUndefined();
      }
    });

    it('sends identity when the client does not accept gzip', async () => {
      const app = createApp(await loadModules({ nodeEnv: 'development' }));

      const res = await request(app).get('/js/app.js').set('Accept-Encoding', 'identity');
      expect(res.headers['content-encoding']).toBeUndefined();
    });
  });

  describe('production serving', () => {
    it('serves dist/ first with src/public as fallback', async () => {
      const modules = await loadModules({ nodeEnv: 'production', distExists: true });

      expect(modules.SERVE_DIST).toBe(true);
      expect(modules.staticAssets).toHaveLength(2);
      expect(modules.INDEX_FILE).toBe(path.resolve('dist/index.html'));
    });

    it('refuses to start without a build', async () => {
      await expect(loadModules({ nodeEnv: 'production', distExists: false }))
        .rejects.toThrow('dist/index.html is missing');
    });
  });
});
