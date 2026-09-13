import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Readable } from 'stream';

vi.mock('../../../../src/server/services/jellyfin/images.service.js', () => ({
  ImagesService: { fetchImageStream: vi.fn() }
}));

const cache = {
  ready: Promise.resolve(),
  isAvailable: vi.fn(() => true),
  resolveWidth: vi.fn(() => 400),
  getImage: vi.fn(),
  createReadStream: vi.fn()
};

vi.mock('../../../../src/server/services/images/image-cache.js', () => ({
  getImageCache: () => cache
}));

import imageRoutes from '../../../../src/server/routes/media/image.routes.js';
import { ImagesService } from '../../../../src/server/services/jellyfin/images.service.js';

const WEBP = Buffer.from('RIFF....WEBPVP8 ');

function createApp(session = { userId: 'u1', accessToken: 'tok' }) {
  const app = express();
  app.use((req, res, next) => {
    req.session = session;
    next();
  });
  app.use('/image', imageRoutes);
  return app;
}

const cachedImage = (overrides = {}) => ({
  key: 'abc/Primary-t1-400.webp',
  etag: '"abc/Primary-t1-400.webp"',
  path: '/cache/abc/Primary-t1-400.webp',
  size: WEBP.length,
  width: 400,
  fromCache: true,
  ...overrides
});

describe('GET /image/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    cache.isAvailable.mockReturnValue(true);
    cache.resolveWidth.mockReturnValue(400);
    cache.createReadStream.mockImplementation(() => Readable.from([WEBP]));
  });

  it('rejects requests without a session', async () => {
    const res = await request(createApp({})).get('/image/abc');
    expect(res.status).toBe(401);
  });

  it('serves the cached WebP with an immutable cache header when a tag is given', async () => {
    cache.getImage.mockResolvedValue(cachedImage());

    const res = await request(createApp()).get('/image/abc?type=Primary&tag=t1&maxWidth=400');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers['etag']).toBe('"abc/Primary-t1-400.webp"');
    expect(res.headers['content-length']).toBe(String(WEBP.length));
    expect(Buffer.from(res.body).equals(WEBP)).toBe(true);
    expect(cache.resolveWidth).toHaveBeenCalledWith('Primary', { width: undefined, height: undefined, maxWidth: '400', maxHeight: undefined });
    expect(cache.getImage).toHaveBeenCalledWith({ itemId: 'abc', type: 'Primary', tag: 't1', width: 400, token: 'tok' });
  });

  it('uses a short cache lifetime without a tag and defaults the type to Primary', async () => {
    cache.getImage.mockResolvedValue(cachedImage({ key: 'abc/Primary-notag-400.webp', etag: '"abc/Primary-notag-400.webp"' }));

    const res = await request(createApp()).get('/image/abc?maxWidth=400');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
    expect(cache.getImage).toHaveBeenCalledWith(expect.objectContaining({ type: 'Primary', tag: undefined }));
  });

  it('answers 304 when If-None-Match carries the ETag', async () => {
    cache.getImage.mockResolvedValue(cachedImage());

    const res = await request(createApp())
      .get('/image/abc?type=Primary&tag=t1&maxWidth=400')
      .set('If-None-Match', 'W/"other", "abc/Primary-t1-400.webp"');

    expect(res.status).toBe(304);
    expect(res.headers['etag']).toBe('"abc/Primary-t1-400.webp"');
    expect(cache.createReadStream).not.toHaveBeenCalled();
  });

  it('falls back to the SVG placeholder when the image cannot be rendered', async () => {
    cache.getImage.mockRejectedValue(Object.assign(new Error('Jellyfin antwortete mit 404'), { status: 404 }));

    const res = await request(createApp()).get('/image/abc?type=Backdrop&tag=t1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/svg\+xml/);
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['etag']).not.toBe('"abc/Primary-t1-400.webp"');
    const svg = res.body.toString();
    expect(svg).toContain('Bild nicht verfügbar');
    expect(svg).toContain('width="320"');
  });

  it('proxies the Jellyfin response untouched when sharp is unavailable', async () => {
    cache.isAvailable.mockReturnValue(false);
    ImagesService.fetchImageStream.mockResolvedValue({
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      body: Readable.toWeb(Readable.from([Buffer.from('jpeg-bytes')]))
    });

    const res = await request(createApp()).get('/image/abc?type=Primary&tag=t1&maxWidth=400&quality=90');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toBe('public, max-age=86400');
    expect(res.body.toString()).toBe('jpeg-bytes');
    expect(ImagesService.fetchImageStream).toHaveBeenCalledWith('abc', 'tok', 'Primary', {
      tag: 't1', width: undefined, height: undefined, maxWidth: '400', maxHeight: undefined, quality: '90'
    });
    expect(cache.getImage).not.toHaveBeenCalled();
  });
});
