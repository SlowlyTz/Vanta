import fs from 'fs';
import fsp from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import env from '../../config/env.js';
import { ImagesService } from '../jellyfin/images.service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(dirname(dirname(dirname(__dirname))));
const DEFAULT_DIR = join(REPO_ROOT, 'cache', 'images');

// Every request is snapped up to one of these widths so a handful of files per
// image serve all card sizes. Backdrops are the only wide type; everything else
// (posters, logos, thumbs) uses the poster steps.
export const POSTER_STEPS = [200, 400, 800];
export const BACKDROP_STEPS = [800, 1280, 1920];

const POSTER_QUALITY = 82;
const BACKDROP_QUALITY = 80;
const WEBP_EFFORT = 4;
const MAX_JOBS = 4;
const NEGATIVE_TTL_MS = 60 * 1000;

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

export const isWideType = (type) => type === 'Backdrop';

export const stepsFor = (type) => (isWideType(type) ? BACKDROP_STEPS : POSTER_STEPS);

const toNumber = (value) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : null;
};

// Maps the proxy's query (width/height/maxWidth/maxHeight) onto a step width.
// A height-only request is converted with the type's usual aspect ratio; no
// size at all means the largest step, which is what the untouched original
// came closest to before.
export function resolveWidth(type, query = {}) {
  const steps = stepsFor(type);
  let wanted = toNumber(query.width) ?? toNumber(query.maxWidth);

  if (wanted === null) {
    const height = toNumber(query.height) ?? toNumber(query.maxHeight);
    if (height !== null) wanted = Math.round(height * (isWideType(type) ? 16 / 9 : 2 / 3));
  }

  if (wanted === null) return steps[steps.length - 1];
  return steps.find(step => step >= wanted) ?? steps[steps.length - 1];
}

export function buildKey({ itemId, type, tag, width }) {
  return `${itemId}/${type}-${tag || 'notag'}-${width}.webp`;
}

const assertSafe = (value, name) => {
  if (!SAFE_SEGMENT.test(String(value ?? ''))) {
    const error = new Error(`Ungültiger Wert für ${name}`);
    error.status = 400;
    throw error;
  }
};

async function loadSharpModule() {
  const module = await import('sharp');
  return module.default || module;
}

const defaultFetchOriginal = (itemId, type, tag, token) =>
  ImagesService.fetchImageStream(itemId, token, type, { tag });

// Disk cache of resized WebP renditions. Misses fetch the original from
// Jellyfin, resize it once and write it atomically; hits are plain files.
export function createImageCache({
  dir = env.IMAGE_CACHE_DIR ? resolve(REPO_ROOT, env.IMAGE_CACHE_DIR) : DEFAULT_DIR,
  loadSharp = loadSharpModule,
  fetchOriginal = defaultFetchOriginal,
  log = console,
  now = Date.now,
  maxJobs = MAX_JOBS,
  negativeTtlMs = NEGATIVE_TTL_MS
} = {}) {
  let sharp = null;
  const inflight = new Map();
  const negative = new Map();

  const ready = (async () => {
    try {
      sharp = await loadSharp();
    } catch (error) {
      sharp = null;
      log.warn?.(`[Bilder] sharp konnte nicht geladen werden, Bilder werden ohne Cache durchgereicht: ${error.message}`);
    }
  })();

  // Small semaphore so a page full of posters cannot start 40 resizes at once.
  let active = 0;
  const waiting = [];
  const acquire = () => new Promise(release => {
    if (active < maxJobs) { active++; release(); } else waiting.push(release);
  });
  const release = () => {
    const next = waiting.shift();
    if (next) next(); else active--;
  };

  const negativeKey = (itemId, type, tag) => `${itemId}/${type}-${tag || 'notag'}`;

  const checkNegative = (key) => {
    const expiresAt = negative.get(key);
    if (expiresAt === undefined) return;
    if (expiresAt > now()) {
      const error = new Error('Bild zuletzt nicht gefunden');
      error.status = 404;
      throw error;
    }
    negative.delete(key);
  };

  const render = async ({ itemId, type, tag, width, token, filePath }) => {
    const response = await fetchOriginal(itemId, type, tag, token);
    if (!response.ok) {
      negative.set(negativeKey(itemId, type, tag), now() + negativeTtlMs);
      const error = new Error(`Jellyfin antwortete mit ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const original = Buffer.from(await response.arrayBuffer());
    const tmpPath = `${filePath}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;

    await acquire();
    try {
      await fsp.mkdir(dirname(filePath), { recursive: true });
      await sharp(original)
        .rotate()
        .resize({ width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: isWideType(type) ? BACKDROP_QUALITY : POSTER_QUALITY, effort: WEBP_EFFORT })
        .toFile(tmpPath);
      await fsp.rename(tmpPath, filePath);
    } catch (error) {
      await fsp.unlink(tmpPath).catch(() => {});
      throw error;
    } finally {
      release();
    }
  };

  // Resolves to the cached file for one rendition, rendering it first when it
  // is missing. Concurrent requests for the same key share one lookup, so the
  // in-flight entry is registered before the first await.
  const getImage = async ({ itemId, type = 'Primary', tag = null, width, token }) => {
    assertSafe(itemId, 'itemId');
    assertSafe(type, 'type');
    if (tag) assertSafe(tag, 'tag');

    const stepWidth = stepsFor(type).includes(width) ? width : resolveWidth(type, { width });
    const key = buildKey({ itemId, type, tag, width: stepWidth });
    const filePath = join(dir, key);
    const result = { key, path: filePath, etag: `"${key}"`, width: stepWidth };

    const pending = inflight.get(key);
    if (pending) return pending;

    const job = (async () => {
      await ready;
      if (!sharp) throw new Error('sharp ist nicht verfügbar');

      const existing = await fsp.stat(filePath).catch(() => null);
      if (existing) return { ...result, size: existing.size, fromCache: true };

      checkNegative(negativeKey(itemId, type, tag));
      await render({ itemId, type, tag, width: stepWidth, token, filePath });
      return { ...result, size: (await fsp.stat(filePath)).size, fromCache: false };
    })().finally(() => inflight.delete(key));

    inflight.set(key, job);
    return job;
  };

  // Pre-renders the card sizes for catalogue items so the first page view after
  // a sync is served from disk. Failures are counted, never thrown.
  const warm = async (items, { token, concurrency = 3 } = {}) => {
    await ready;
    if (!sharp || !Array.isArray(items) || items.length === 0) return null;

    const jobs = [];
    for (const item of items) {
      if (!item?.Id) continue;
      const poster = item.ImageTags?.Primary;
      const backdrop = item.BackdropImageTags?.[0];
      if (poster) jobs.push({ itemId: item.Id, type: 'Primary', tag: poster, width: 400 });
      if (backdrop) jobs.push({ itemId: item.Id, type: 'Backdrop', tag: backdrop, width: 1280 });
    }
    if (jobs.length === 0) return null;

    const startedAt = now();
    const stats = { posters: 0, backdrops: 0, failed: 0, durationMs: 0 };
    let cursor = 0;

    const worker = async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        try {
          const image = await getImage({ ...job, token });
          if (!image.fromCache) stats[job.type === 'Backdrop' ? 'backdrops' : 'posters']++;
        } catch {
          stats.failed++;
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
    stats.durationMs = now() - startedAt;

    if (stats.posters || stats.backdrops) {
      const seconds = (stats.durationMs / 1000).toFixed(1);
      log.info?.(`[Bilder] Vorgeladen: ${stats.posters} Poster, ${stats.backdrops} Backdrops (${seconds} s)`);
    }
    return stats;
  };

  const createReadStream = (filePath) => fs.createReadStream(filePath);

  return {
    ready,
    dir,
    isAvailable: () => sharp !== null,
    resolveWidth,
    buildKey,
    getImage,
    warm,
    createReadStream
  };
}

let instance = null;

export function getImageCache() {
  if (!instance) instance = createImageCache();
  return instance;
}
