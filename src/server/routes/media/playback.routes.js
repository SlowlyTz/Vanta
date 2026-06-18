import express from 'express';
import { PlaybackApiService } from '../../services/jellyfin/playback-api.service.js';
import { PlaybackService } from '../../services/playback.service.js';
import { SettingsService } from '../../services/settings.service.js';
import { requireAuth, isUpstreamUnauthorized, destroyInvalidSession } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forwardHeaders, pipeReadable, FORWARD_HEADERS } from './proxyHelpers.js';

const router = express.Router();

router.get('/proxy', requireAuth, asyncHandler(async (req, res) => {
  const { accessToken } = req.session;
  const { path: targetPath } = req.query;
  const rangeHeader = req.headers.range;

  try {
    const normalizedPath = PlaybackService.normalizeJellyfinPath(targetPath);
    const upstreamResponse = await PlaybackApiService.fetchPlaybackResource(normalizedPath, accessToken, rangeHeader);
    const contentType = upstreamResponse.headers.get('content-type') || '';
    const isPlaylist = PlaybackService.isPlaylistResponse(contentType, normalizedPath);

    res.status(upstreamResponse.status);

    const headers = [...FORWARD_HEADERS.playback];
    if (!isPlaylist) headers.push('content-length');
    forwardHeaders(upstreamResponse, res, headers);

    if (isPlaylist) {
      res.setHeader('content-type', contentType || 'application/vnd.apple.mpegurl');
      res.setHeader('cache-control', 'no-store');
      const playlist = await upstreamResponse.text();
      return res.send(PlaybackService.rewritePlaylist(playlist, normalizedPath));
    }

    return pipeReadable(upstreamResponse, req, res);
  } catch (error) {
    console.error('[Playback Proxy Error] Failed to proxy playback resource:', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to proxy playback resource' });
    }
  }
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const { forceHlsTranscoding } = await SettingsService.getTranscodingSettings();
    const userAgent = req.headers['user-agent'] || '';
    const playbackInfo = await PlaybackApiService.getPlaybackInfo(
      userId,
      accessToken,
      id,
      { userAgent, forceHlsTranscoding }
    );
    const playback = PlaybackService.resolvePlayback(playbackInfo, id, { forceHlsTranscoding });

    res.setHeader('Cache-Control', 'no-store');
    return res.json(playback);
  } catch (error) {
    console.error(`[Playback Resolve Error] Failed to resolve playback for ${id}:`, error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Failed to resolve playback media source' });
  }
}));

export default router;
