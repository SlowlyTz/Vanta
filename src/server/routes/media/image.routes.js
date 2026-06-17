import express from 'express';
import { ImagesService } from '../../services/jellyfin/images.service.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forwardHeaders, pipeReadable, getSvgPlaceholder, FORWARD_HEADERS } from './proxyHelpers.js';

const router = express.Router();

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { accessToken } = req.session;
  const { id } = req.params;
  const { type = 'Primary', tag, width, height, maxWidth, maxHeight, quality } = req.query;

  try {
    const imageResponse = await ImagesService.fetchImageStream(id, accessToken, type, {
      tag,
      width, height, maxWidth, maxHeight, quality
    });

    res.setHeader('Content-Type', imageResponse.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    return pipeReadable(imageResponse, req, res);
  } catch (error) {
    console.error(`[Image Proxy Error] Failed to proxy image ${id} (${type}):`, error.message);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(getSvgPlaceholder(type));
  }
}));

export default router;
