import express from 'express';
import { PlaybackApiService } from '../../services/jellyfin/playback-api.service.js';
import { streamSessionService } from '../../services/stream-session.service.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forwardHeaders, pipeReadable, ensureContentType, FORWARD_HEADERS } from './proxyHelpers.js';

const router = express.Router();
const HEARTBEAT_INTERVAL_MS = 20_000;

// Legacy direct-stream proxy with no Jellyfin PlaySessionId or lifecycle
// reports of its own. It still has to respect per-user stream limits, so it
// reserves its own synthetic session for the lifetime of the HTTP connection
// and heartbeats it to avoid the reserved/active TTL evicting a long stream.
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { accessToken, userId, username } = req.session;
  const { id } = req.params;
  const rangeHeader = req.headers.range;
  const playSessionId = `legacy:${id}:${userId}:${Date.now()}`;

  try {
    streamSessionService.reserve({ userId, username, itemId: id, playSessionId });
  } catch (error) {
    if (error.code === 'STREAM_LIMIT_REACHED') {
      return res.status(429).json({
        error: error.message,
        code: error.code,
        limit: error.limit,
        activeStreams: error.activeStreams
      });
    }
    throw error;
  }

  streamSessionService.markStarted(userId, playSessionId);
  const heartbeat = setInterval(
    () => streamSessionService.touch(userId, playSessionId),
    HEARTBEAT_INTERVAL_MS
  );
  res.once('close', () => {
    clearInterval(heartbeat);
    streamSessionService.release(userId, playSessionId);
  });

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
