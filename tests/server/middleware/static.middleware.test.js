import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const PLAYER_DIR = path.resolve('src/public/vendor/player');
const HASHED_CHUNK = fs.readdirSync(PLAYER_DIR).find(name => /-[A-Za-z0-9_-]{8}\.js$/.test(name));

async function loadModules() {
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
  describe('cache policy', () => {
    it('revalidates the shell and unhashed files, keeps hashed chunks and images', async () => {
      const { cacheControlFor } = await loadModules();

      expect(cacheControlFor('index.html')).toBe('no-cache');
      expect(cacheControlFor('js/app.js')).toBe('no-cache');
      expect(cacheControlFor('css/components/settings/settings-overview.css')).toBe('no-cache');
      expect(cacheControlFor('vendor/player/vanta-player.js')).toBe('no-cache');
      expect(cacheControlFor('vendor/intro/vanta-intro.js')).toBe('no-cache');
      expect(cacheControlFor('vendor/player/provider-B5sjnEci.js')).toBe('public, max-age=31536000, immutable');
      expect(cacheControlFor('assets/logo-vanta.png')).toBe('public, max-age=86400');
      expect(cacheControlFor('assets/fonts/outfit-latin.woff2')).toBe('public, max-age=86400');
    });
  });

  describe('development serving', () => {
    it('sends the shell with no-cache and an ETag on / and /index.html', async () => {
      const app = createApp(await loadModules());

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
      const app = createApp(await loadModules());

      expect((await request(app).get('/vendor/intro/vanta-intro.js')).headers['cache-control']).toBe('no-cache');
      expect((await request(app).get(`/vendor/player/${HASHED_CHUNK}`)).headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect((await request(app).get('/assets/logo-vanta.png')).headers['cache-control']).toBe('public, max-age=86400');
      expect((await request(app).get('/css/base.css')).headers['cache-control']).toBe('no-cache');
    });

    it('answers a conditional request for an unchanged file with 304', async () => {
      const app = createApp(await loadModules());
      const first = await request(app).get('/js/app.js');

      const res = await request(app).get('/js/app.js').set('If-None-Match', first.headers.etag);
      expect(res.status).toBe(304);
    });
  });

  describe('compression', () => {
    it('gzips scripts, stylesheets, the shell and JSON when the client accepts gzip', async () => {
      const app = createApp(await loadModules());

      for (const url of ['/js/app.js', '/css/base.css', '/', '/api/media/library']) {
        const res = await request(app).get(url).set('Accept-Encoding', 'gzip');
        expect(res.status).toBe(200);
        expect(res.headers['content-encoding']).toBe('gzip');
        expect(res.headers.vary).toMatch(/Accept-Encoding/);
      }
    });

    it('leaves fonts, images and the media proxies uncompressed', async () => {
      const app = createApp(await loadModules());

      for (const url of ['/assets/fonts/outfit-latin.woff2', '/assets/logo-vanta.png', '/api/media/image/abc']) {
        const res = await request(app).get(url).set('Accept-Encoding', 'gzip');
        expect(res.status).toBe(200);
        expect(res.headers['content-encoding']).toBeUndefined();
      }
    });

    it('sends identity when the client does not accept gzip', async () => {
      const app = createApp(await loadModules());

      const res = await request(app).get('/js/app.js').set('Accept-Encoding', 'identity');
      expect(res.headers['content-encoding']).toBeUndefined();
    });
  });
});
