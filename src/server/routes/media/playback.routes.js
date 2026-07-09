import express from 'express';
import { PlaybackApiService } from '../../services/jellyfin/playback-api.service.js';
import { PlaybackService } from '../../services/playback.service.js';
import { requireAuth, isUpstreamUnauthorized, destroyInvalidSession } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forwardHeaders, pipeReadable, FORWARD_HEADERS } from './proxyHelpers.js';
import { isValidQualityProfile, getQualityConstraints } from './playback.validation.js';

const router = express.Router();
const REPORT_EVENTS = new Set(['start', 'progress', 'stopped', 'ended']);
const PLAY_METHODS = new Set(['DirectPlay', 'DirectStream', 'Transcode']);
const FORCE_HLS_TRANSCODING = true;

const nullableInteger = value => Number.isInteger(value) ? value : null;

const buildPlaybackReport = body => {
  const positionTicks = Number(body.positionTicks);
  const volumeLevel = Number(body.volumeLevel);
  const playbackRate = Number(body.playbackRate);

  if (!body.itemId || !body.playSessionId || !Number.isFinite(positionTicks) || positionTicks < 0) {
    const error = new Error('Invalid playback report payload');
    error.status = 400;
    throw error;
  }

  return {
    ItemId: String(body.itemId),
    MediaSourceId: body.mediaSourceId ? String(body.mediaSourceId) : null,
    PlaySessionId: String(body.playSessionId),
    PositionTicks: Math.round(positionTicks),
    IsPaused: Boolean(body.isPaused),
    IsMuted: Boolean(body.isMuted),
    VolumeLevel: Number.isFinite(volumeLevel) ? Math.max(0, Math.min(100, Math.round(volumeLevel))) : 100,
    PlaybackRate: Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1,
    PlayMethod: PLAY_METHODS.has(body.playMethod) ? body.playMethod : 'DirectPlay',
    CanSeek: body.canSeek !== false,
    AudioStreamIndex: nullableInteger(body.audioStreamIndex),
    SubtitleStreamIndex: nullableInteger(body.subtitleStreamIndex),
    RepeatMode: 'RepeatNone'
  };
};

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

router.post('/report/:event', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { event } = req.params;

  if (!REPORT_EVENTS.has(event)) {
    return res.status(400).json({ error: 'Unsupported playback report event' });
  }

  try {
    const report = buildPlaybackReport(req.body || {});
    await PlaybackApiService.reportPlayback(accessToken, event, report);

    if (event === 'ended') {
      await PlaybackApiService.markPlayed(userId, accessToken, report.ItemId);
    }

    return res.status(204).end();
  } catch (error) {
    console.error(`[Playback Report Error] ${event}:`, error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(502).json({ error: 'Failed to report playback state' });
  }
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;
  const requestedMode = String(req.query.mode || 'auto').toLowerCase();
  const requestedQualityProfile = String(req.query.qualityProfile || 'auto').toLowerCase();

  if (!['auto', 'hls'].includes(requestedMode)) {
    return res.status(400).json({ error: 'Unsupported playback mode' });
  }

  if (!isValidQualityProfile(requestedQualityProfile)) {
    return res.status(400).json({ error: 'Unsupported quality profile' });
  }

  try {
    const shouldForceHls = requestedMode === 'hls' || FORCE_HLS_TRANSCODING;

    if (requestedQualityProfile === 'direct' && shouldForceHls) {
      return res.status(400).json({ error: 'Direct Play is disabled by server configuration' });
    }

    const qualityConstraints = getQualityConstraints(requestedQualityProfile);
    const userAgent = req.headers['user-agent'] || '';
    const playbackInfo = await PlaybackApiService.getPlaybackInfo(
      userId,
      accessToken,
      id,
      {
        userAgent,
        forceHlsTranscoding: shouldForceHls,
        maxStreamingBitrate: qualityConstraints?.maxStreamingBitrate ?? null
      }
    );

    const playback = PlaybackService.resolvePlayback(playbackInfo, id, {
      forceHlsTranscoding: shouldForceHls,
      requestedQualityProfile
    });

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
