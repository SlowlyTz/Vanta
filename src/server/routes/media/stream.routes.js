import express from 'express';
import { PlaybackApiService } from '../../services/jellyfin/playback-api.service.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forwardHeaders, pipeReadable, ensureContentType, FORWARD_HEADERS } from './proxyHelpers.js';

const router = express.Router();

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { accessToken } = req.session;
  const { id } = req.params;
  const rangeHeader = req.headers.range;

  try {
    const streamResponse = await PlaybackApiService.fetchVideoStream(id, accessToken, rangeHeader);

    res.status(streamResponse.status);
    forwardHeaders(streamResponse, res, FORWARD_HEADERS.stream);
    ensureContentType(res, 'video/mp4');

    return pipeReadable(streamResponse, req, res);
  } catch (error) {
    console.error(`[Stream Proxy Error] Failed to stream video ${id}:`, error.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to stream media content' });
    }
  }
}));

export default router;
