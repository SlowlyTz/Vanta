import express from 'express';
import { pipeline } from 'stream/promises';
import { ImagesService } from '../../services/jellyfin/images.service.js';
import { getImageCache } from '../../services/images/image-cache.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { pipeReadable, getSvgPlaceholder } from './proxyHelpers.js';

const router = express.Router();

const IMMUTABLE = 'public, max-age=31536000, immutable';
const SHORT = 'public, max-age=3600';

const PERSON_PLACEHOLDER = '/assets/person-placeholder.webp';

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
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return pipeReadable(imageResponse, req, res);
};

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { accessToken } = req.session;
  const { id } = req.params;
  const { type = 'Primary', tag, width, height, maxWidth, maxHeight, quality, fallback } = req.query;
  const cache = getImageCache();

  try {
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
