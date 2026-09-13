import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import { join } from 'path';
import sharp from 'sharp';

vi.mock('../../../../src/server/config/env.js', () => ({
  default: { JELLYFIN_API_KEY: 'test-key', JELLYFIN_BASE_URL: 'http://jellyfin.test', IMAGE_CACHE_DIR: '' }
}));

import {
  createImageCache,
  resolveWidth,
  buildKey,
  POSTER_STEPS,
  BACKDROP_STEPS
} from '../../../../src/server/services/images/image-cache.js';

const png = (width, height, alpha = false) => sharp({
  create: { width, height, channels: 4, background: alpha ? { r: 255, g: 0, b: 0, alpha: 0.5 } : { r: 10, g: 20, b: 30, alpha: 1 } }
}).png().toBuffer();

const okResponse = (buffer) => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
});

const failResponse = (status = 404) => ({ ok: false, status, arrayBuffer: async () => new ArrayBuffer(0) });

const metadata = (path) => sharp(path).metadata();

describe('resolveWidth', () => {
  it('snaps poster widths up to the next step', () => {
    expect(resolveWidth('Primary', { maxWidth: '160' })).toBe(200);
    expect(resolveWidth('Primary', { maxWidth: '200' })).toBe(200);
    expect(resolveWidth('Primary', { width: 201 })).toBe(400);
    expect(resolveWidth('Thumb', { maxWidth: 401 })).toBe(800);
    expect(resolveWidth('Logo', { maxWidth: 400 })).toBe(400);
  });

  it('caps at the largest step instead of upscaling further', () => {
    expect(resolveWidth('Primary', { maxWidth: 1280 })).toBe(800);
    expect(resolveWidth('Backdrop', { maxWidth: 4000 })).toBe(1920);
  });

  it('uses backdrop steps only for Backdrop', () => {
    expect(resolveWidth('Backdrop', { maxWidth: 1280 })).toBe(1280);
    expect(resolveWidth('Backdrop', { maxWidth: 700 })).toBe(800);
    expect(resolveWidth('Backdrop', { maxWidth: 1281 })).toBe(1920);
  });

  it('derives a width from a height-only request and defaults to the largest step', () => {
    expect(resolveWidth('Primary', { maxHeight: 300 })).toBe(200);
    expect(resolveWidth('Backdrop', { height: 720 })).toBe(1280);
    expect(resolveWidth('Primary', {})).toBe(800);
    expect(resolveWidth('Backdrop', { maxWidth: 'abc' })).toBe(1920);
  });

  it('exposes the step tables', () => {
    expect(POSTER_STEPS).toEqual([200, 400, 800]);
    expect(BACKDROP_STEPS).toEqual([800, 1280, 1920]);
  });
});

describe('buildKey', () => {
  it('nests by item and names the rendition by type, tag and width', () => {
    expect(buildKey({ itemId: 'abc', type: 'Primary', tag: 't1', width: 400 })).toBe('abc/Primary-t1-400.webp');
    expect(buildKey({ itemId: 'abc', type: 'Backdrop', tag: null, width: 1280 })).toBe('abc/Backdrop-notag-1280.webp');
  });
});

describe('createImageCache', () => {
  let dir;
  let log;

  beforeEach(async () => {
    dir = await fsp.mkdtemp(join(os.tmpdir(), 'vanta-image-cache-'));
    log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  });

  afterEach(async () => {
    await fsp.rm(dir, { recursive: true, force: true });
  });

  const setup = (overrides = {}) => {
    const fetchOriginal = overrides.fetchOriginal || vi.fn(async () => okResponse(await png(1000, 1500)));
    const cache = createImageCache({ dir, log, ...overrides, fetchOriginal });
    return { cache, fetchOriginal };
  };

  it('renders a WebP at the step width on a miss and serves the file on the next request', async () => {
    const { cache, fetchOriginal } = setup();

    const miss = await cache.getImage({ itemId: 'item1', type: 'Primary', tag: 'tag1', width: 400, token: 'tok' });
    expect(miss.fromCache).toBe(false);
    expect(miss.key).toBe('item1/Primary-tag1-400.webp');
    expect(miss.etag).toBe('"item1/Primary-tag1-400.webp"');
    expect(miss.path).toBe(join(dir, 'item1', 'Primary-tag1-400.webp'));
    expect(miss.size).toBeGreaterThan(0);
    expect(fetchOriginal).toHaveBeenCalledWith('item1', 'Primary', 'tag1', 'tok');

    const meta = await metadata(miss.path);
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(600);

    const hit = await cache.getImage({ itemId: 'item1', type: 'Primary', tag: 'tag1', width: 400, token: 'tok' });
    expect(hit.fromCache).toBe(true);
    expect(hit.size).toBe(miss.size);
    expect(fetchOriginal).toHaveBeenCalledTimes(1);

    expect(fs.readdirSync(join(dir, 'item1'))).toEqual(['Primary-tag1-400.webp']);
  });

  it('snaps an off-step width and never enlarges a small source', async () => {
    const { cache } = setup({ fetchOriginal: vi.fn(async () => okResponse(await png(300, 450))) });

    const image = await cache.getImage({ itemId: 'small', type: 'Primary', tag: 't', width: 350, token: 'tok' });
    expect(image.width).toBe(400);
    expect(image.key).toBe('small/Primary-t-400.webp');

    const meta = await metadata(image.path);
    expect(meta.width).toBe(300);
    expect(meta.height).toBe(450);
  });

  it('keeps the alpha channel of logos', async () => {
    const { cache } = setup({ fetchOriginal: vi.fn(async () => okResponse(await png(800, 300, true))) });

    const image = await cache.getImage({ itemId: 'logo', type: 'Logo', tag: 'l', width: 400, token: 'tok' });
    const meta = await metadata(image.path);
    expect(meta.width).toBe(400);
    expect(meta.hasAlpha).toBe(true);
  });

  it('fetches the original only once for concurrent misses of the same key', async () => {
    const { cache, fetchOriginal } = setup();

    const results = await Promise.all(
      Array.from({ length: 6 }, () => cache.getImage({ itemId: 'dup', type: 'Primary', tag: 't', width: 200, token: 'tok' }))
    );

    expect(fetchOriginal).toHaveBeenCalledTimes(1);
    expect(results.every(result => result.path === results[0].path)).toBe(true);
    expect(fs.existsSync(results[0].path)).toBe(true);
  });

  it('limits the number of concurrent sharp jobs', async () => {
    let active = 0;
    let peak = 0;
    const slowSharp = (buffer) => {
      const instance = sharp(buffer);
      const toFile = instance.toFile.bind(instance);
      instance.toFile = async (path) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise(resolve => setTimeout(resolve, 20));
        const result = await toFile(path);
        active--;
        return result;
      };
      return instance;
    };
    const { cache } = setup({ maxJobs: 2, loadSharp: async () => slowSharp });

    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        cache.getImage({ itemId: `job${index}`, type: 'Primary', tag: 't', width: 200, token: 'tok' })
      )
    );

    expect(peak).toBe(2);
  });

  it('rejects unsafe path segments', async () => {
    const { cache, fetchOriginal } = setup();

    await expect(cache.getImage({ itemId: '../etc', type: 'Primary', width: 200, token: 'tok' })).rejects.toMatchObject({ status: 400 });
    await expect(cache.getImage({ itemId: 'ok', type: 'Primary/../x', width: 200, token: 'tok' })).rejects.toMatchObject({ status: 400 });
    await expect(cache.getImage({ itemId: 'ok', type: 'Primary', tag: 'a b', width: 200, token: 'tok' })).rejects.toMatchObject({ status: 400 });
    expect(fetchOriginal).not.toHaveBeenCalled();
  });

  it('remembers a Jellyfin 404 for a short time and does not write a file', async () => {
    let clock = 1_000;
    const fetchOriginal = vi.fn(async () => failResponse(404));
    const { cache } = setup({ fetchOriginal, now: () => clock, negativeTtlMs: 60_000 });
    const params = { itemId: 'gone', type: 'Primary', tag: 't', width: 400, token: 'tok' };

    await expect(cache.getImage(params)).rejects.toMatchObject({ status: 404 });
    await expect(cache.getImage(params)).rejects.toMatchObject({ status: 404 });
    await expect(cache.getImage({ ...params, width: 200 })).rejects.toMatchObject({ status: 404 });
    expect(fetchOriginal).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(join(dir, 'gone'))).toBe(false);

    clock += 60_001;
    await expect(cache.getImage(params)).rejects.toMatchObject({ status: 404 });
    expect(fetchOriginal).toHaveBeenCalledTimes(2);
  });

  it('leaves no temp file behind when the source is not an image', async () => {
    const { cache } = setup({ fetchOriginal: vi.fn(async () => okResponse(Buffer.from('not an image'))) });

    await expect(cache.getImage({ itemId: 'broken', type: 'Primary', tag: 't', width: 400, token: 'tok' })).rejects.toBeInstanceOf(Error);
    expect(fs.readdirSync(join(dir, 'broken'))).toEqual([]);
  });

  it('reports itself unavailable and warns once when sharp cannot be loaded', async () => {
    const { cache, fetchOriginal } = setup({ loadSharp: async () => { throw new Error('libvips fehlt'); } });

    await cache.ready;
    expect(cache.isAvailable()).toBe(false);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][0]).toMatch(/\[Bilder\] sharp konnte nicht geladen werden.*libvips fehlt/);

    await expect(cache.getImage({ itemId: 'x', type: 'Primary', width: 400, token: 'tok' })).rejects.toThrow(/sharp/);
    expect(await cache.warm([{ Id: 'x', ImageTags: { Primary: 'p' } }], { token: 'tok' })).toBeNull();
    expect(fetchOriginal).not.toHaveBeenCalled();
  });

  describe('warm', () => {
    it('renders posters at 400 and backdrops at 1280 for the given items with the given token', async () => {
      let clock = 5_000;
      const { cache, fetchOriginal } = setup({ now: () => (clock += 250) });
      const items = [
        { Id: 'm1', ImageTags: { Primary: 'p1' }, BackdropImageTags: ['b1'] },
        { Id: 'm2', ImageTags: { Primary: 'p2' } },
        { Id: 'm3', BackdropImageTags: ['b3'] },
        { Id: 'm4' },
        null
      ];

      const stats = await cache.warm(items, { token: 'api-key', concurrency: 2 });

      expect(stats).toMatchObject({ posters: 2, backdrops: 2, failed: 0 });
      expect(fetchOriginal).toHaveBeenCalledTimes(4);
      expect(fetchOriginal).toHaveBeenCalledWith('m1', 'Primary', 'p1', 'api-key');
      expect(fetchOriginal).toHaveBeenCalledWith('m1', 'Backdrop', 'b1', 'api-key');
      expect(fs.existsSync(join(dir, 'm1', 'Primary-p1-400.webp'))).toBe(true);
      expect(fs.existsSync(join(dir, 'm1', 'Backdrop-b1-1280.webp'))).toBe(true);
      expect(fs.existsSync(join(dir, 'm3', 'Backdrop-b3-1280.webp'))).toBe(true);
      expect(log.info).toHaveBeenCalledTimes(1);
      expect(log.info.mock.calls[0][0]).toMatch(/^\[Bilder\] Vorgeladen: 2 Poster, 2 Backdrops \(\d+\.\d s\)$/);
    });

    it('counts failures instead of throwing and stays quiet when nothing was rendered', async () => {
      const { cache, fetchOriginal } = setup({ fetchOriginal: vi.fn(async () => failResponse(500)) });

      const stats = await cache.warm([{ Id: 'm1', ImageTags: { Primary: 'p1' } }], { token: 'k' });

      expect(stats).toMatchObject({ posters: 0, backdrops: 0, failed: 1 });
      expect(fetchOriginal).toHaveBeenCalledTimes(1);
      expect(log.info).not.toHaveBeenCalled();
    });

    it('does nothing for an empty list or items without images', async () => {
      const { cache, fetchOriginal } = setup();

      expect(await cache.warm([], { token: 'k' })).toBeNull();
      expect(await cache.warm([{ Id: 'm1' }], { token: 'k' })).toBeNull();
      expect(fetchOriginal).not.toHaveBeenCalled();
      expect(log.info).not.toHaveBeenCalled();
    });

    it('does not count renditions that were already cached', async () => {
      const { cache } = setup();
      const items = [{ Id: 'm1', ImageTags: { Primary: 'p1' } }];

      await cache.warm(items, { token: 'k' });
      const second = await cache.warm(items, { token: 'k' });

      expect(second).toMatchObject({ posters: 0, backdrops: 0, failed: 0 });
      expect(log.info).toHaveBeenCalledTimes(1);
    });
  });
});
