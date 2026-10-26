import express from 'express';
import { pipeline } from 'stream/promises';
import { ImagesService } from '../../services/jellyfin/images.service.js';
import { getImageCache } from '../../services/images/image-cache.js';
import { getImageAccess } from '../../services/images/image-access.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { pipeReadable, getSvgPlaceholder } from './proxyHelpers.js';
import { validateIdParam } from '../../utils/ids.js';

const router = express.Router();

router.param('id', validateIdParam);

// private: which images a user may see depends on their libraries, so no
// shared cache in between may hand one user's answer to another.
const IMMUTABLE = 'private, max-age=31536000, immutable';
const SHORT = 'private, max-age=3600';

const PERSON_PLACEHOLDER = '/assets/person-placeholder.webp';
const IMAGE_TYPES = new Set(['Primary', 'Backdrop', 'Logo', 'Thumb', 'Banner']);

// `fallback=person` asks for the neutral portrait instead of the generic
// "Bild nicht verfügbar" graphic when the upstream image cannot be served.
const sendPlaceholder = (res, type, fallback) => {
  res.setHeader('Cache-Control', 'no-cache');
  if (fallback === 'person') return res.redirect(302, PERSON_PLACEHOLDER);
  res.setHeader('Content-Type', 'image/svg+xml');
  return res.status(200).send(getSvgPlaceholder(type));
};

const matchesEtag = (header, etag) =>
  typeof header === 'string' && header.split(',').some(value => value.trim().replace(/^W\//, '') === etag);

// Without sharp the route behaves like the old proxy: Jellyfin resizes, the
// response is streamed through untouched.
const proxyThrough = async (req, res, { id, accessToken, type, query }) => {
  const imageResponse = await ImagesService.fetchImageStream(id, accessToken, type, query);
  res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=86400');
  return pipeReadable(imageResponse, req, res);
};

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { accessToken, userId } = req.session;
  const { id } = req.params;
  const { type = 'Primary', tag, width, height, maxWidth, maxHeight, quality, fallback } = req.query;
  const cache = getImageCache();
  if (!IMAGE_TYPES.has(type)) return res.status(400).json({ error: 'Unbekannter Bildtyp' });

  try {
    // Cached renditions are shared by everyone; only users with access to the
    // item's library get them.
    if (!(await getImageAccess().canSee({ userId, token: accessToken, itemId: id }))) {
      return sendPlaceholder(res, type, fallback);
    }

    await cache.ready;
    if (!cache.isAvailable()) {
      return proxyThrough(req, res, { id, accessToken, type, query: { tag, width, height, maxWidth, maxHeight, quality } });
    }

    const stepWidth = cache.resolveWidth(type, { width, height, maxWidth, maxHeight });
    const image = await cache.getImage({ itemId: id, type, tag, width: stepWidth, token: accessToken });

    res.setHeader('ETag', image.etag);
    res.setHeader('Cache-Control', tag ? IMMUTABLE : SHORT);
    if (matchesEtag(req.headers['if-none-match'], image.etag)) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Length', image.size);

    const stream = cache.createReadStream(image.path);
    res.on('close', () => {
      if (!res.writableEnded) stream.destroy();
    });
    try {
      await pipeline(stream, res);
    } catch (error) {
      if (error.code === 'ERR_STREAM_PREMATURE_CLOSE' || res.destroyed || !res.writable) return;
      throw error;
    }
  } catch (error) {
    if (res.headersSent) return;
    console.error(`[Image Proxy Error] Failed to proxy image ${id} (${type}):`, error.message);
    res.removeHeader('ETag');
    return sendPlaceholder(res, type, fallback);
  }
}));

export default router;
