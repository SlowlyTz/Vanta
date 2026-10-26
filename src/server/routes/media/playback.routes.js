import express from 'express';
import { PlaybackApiService } from '../../services/jellyfin/playback-api.service.js';
import { PlaybackService } from '../../services/playback.service.js';
import { streamSessionService } from '../../services/stream-session.service.js';
import { requireAuth, isUpstreamUnauthorized, destroyInvalidSession } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forwardHeaders, pipeReadable, isAbortError, upstreamAbortSignal, FORWARD_HEADERS } from './proxyHelpers.js';
import { isValidQualityProfile, getQualityConstraints } from './playback.validation.js';
import { pickAudioStreamIndex } from '../../services/playback/audioTracks.js';
import { getTranscodeProgress } from '../../services/playback/transcodeProgress.js';
import { isTvDirectPlatform } from '../../services/jellyfin/fields.js';
import { detectTv } from '../../../public/js/shared/tvDetect.js';
import { validateIdParam } from '../../utils/ids.js';

const router = express.Router();

router.param('id', validateIdParam);
// 'cancel': the player was left before playback started. Jellyfin never
// heard of the session, so it gets no report (a stop would overwrite the
// resume position); only the slot and the encoding are freed.
const REPORT_EVENTS = new Set(['start', 'progress', 'stopped', 'ended', 'cancel']);
const PLAY_METHODS = new Set(['DirectPlay', 'DirectStream', 'Transcode']);
// Every stream goes out as HLS, except to a Samsung or LG TV recognised
// for sure: those play HEVC, AC3 and MKV themselves (see fields.js) and fall
// back to HLS in the player when a file does not start.
const FORCE_HLS_TRANSCODING = true;
const forcesHls = userAgent => FORCE_HLS_TRANSCODING && !isTvDirectPlatform(detectTv(userAgent).platform);

// Fire and forget: Jellyfin's idle timer ends a job this misses.
const stopEncodings = (token, playSessionIds = []) => {
  new Set(playSessionIds.filter(Boolean)).forEach(playSessionId => {
    PlaybackApiService.stopEncoding(token, playSessionId).catch(error => {
      console.warn(`[Playback] could not stop the encoding ${playSessionId}:`, error.message);
    });
  });
};

const nullableInteger = value => Number.isInteger(value) ? value : null;

const buildPlaybackReport = body => {
  const positionTicks = Number(body.positionTicks);
  const volumeLevel = Number(body.volumeLevel);
  const playbackRate = Number(body.playbackRate);

  if (!body.itemId || !body.playSessionId || !Number.isFinite(positionTicks) || positionTicks < 0) {
    const error = new Error('Ungültige Wiedergabe-Meldung');
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
    const stream = PlaybackService.streamSessionOf(normalizedPath);
    if (!stream) return res.status(403).json({ error: 'Dieses Ziel wird nicht ausgeliefert' });
    if (stream.playSessionId) {
      try {
        const replaced = streamSessionService.admitStreamRequest({
          userId: req.session.userId,
          username: req.session.username,
          itemId: stream.itemId,
          playSessionId: stream.playSessionId,
          deviceId: req.session.deviceId || req.sessionID || null,
          userAgent: req.headers['user-agent'] || ''
        });
        stopEncodings(accessToken, replaced.filter(sessionId => sessionId !== stream.playSessionId));
      } catch (error) {
        if (error.code === 'STREAM_LIMIT_REACHED') {
          return res.status(429).json({ error: error.message, code: error.code, limit: error.limit, activeStreams: error.activeStreams });
        }
        if (error.status === 403) return res.status(403).json({ error: error.message });
        throw error;
      }
    }
    const upstreamResponse = await PlaybackApiService.fetchPlaybackResource(normalizedPath, accessToken, rangeHeader, {
      signal: upstreamAbortSignal(res)
    });
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
    // The player dropped the request (seek, quality switch): nothing to report.
    if (isAbortError(error) || res.destroyed) return;
    console.error('[Playback Proxy Error] Failed to proxy playback resource:', error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Stream konnte nicht geladen werden' });
    }
  }
}));

router.post('/report/:event', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { event } = req.params;

  if (!REPORT_EVENTS.has(event)) {
    return res.status(400).json({ error: 'Unbekannte Wiedergabe-Meldung' });
  }

  try {
    const report = buildPlaybackReport(req.body || {});
    if (event === 'cancel') {
      streamSessionService.release(userId, report.PlaySessionId);
      stopEncodings(accessToken, [report.PlaySessionId]);
      return res.status(204).end();
    }
    // The slot is free even when Jellyfin does not take the report.
    if (event === 'stopped' || event === 'ended') streamSessionService.release(userId, report.PlaySessionId);

    if (event === 'start' || event === 'progress') {
      const known = event === 'start'
        ? streamSessionService.markStarted(userId, report.PlaySessionId)
        : streamSessionService.touch(userId, report.PlaySessionId);
      // An open player is a stream until it is closed: one the server lost
      // track of counts again, or ends here when the limit is full (before
      // Jellyfin hears of it).
      if (!known) {
        try {
          const replaced = streamSessionService.resume({
            userId,
            username: req.session.username,
            itemId: report.ItemId,
            playSessionId: report.PlaySessionId,
            deviceId: req.session.deviceId || req.sessionID || null,
            userAgent: req.headers['user-agent'] || ''
          });
          stopEncodings(accessToken, (replaced || []).filter(sessionId => sessionId !== report.PlaySessionId));
        } catch (limitError) {
          if (limitError.code !== 'STREAM_LIMIT_REACHED') throw limitError;
          stopEncodings(accessToken, [report.PlaySessionId, ...(limitError.replaced || [])]);
          return res.status(429).json({ error: limitError.message, code: limitError.code, limit: limitError.limit, activeStreams: limitError.activeStreams });
        }
      }
    }

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
    return res.status(502).json({ error: 'Wiedergabestand konnte nicht gemeldet werden' });
  }
}));

// Transcoding progress before the first bytes of a stream arrive (the
// player's loading indicator polls this while it waits).
router.get('/:id/transcode-progress', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  res.setHeader('Cache-Control', 'no-store');
  try {
    return res.json(await getTranscodeProgress({ userId, token: accessToken, itemId: req.params.id }));
  } catch (error) {
    if (isUpstreamUnauthorized(error)) return destroyInvalidSession(req, res);
    return res.json({ available: false, reason: 'error' });
  }
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken, username } = req.session;
  const { id } = req.params;
  const requestedMode = String(req.query.mode || 'auto').toLowerCase();
  const requestedQualityProfile = String(req.query.qualityProfile || 'auto').toLowerCase();
  const audioIndexParam = req.query.audioStreamIndex;
  const requestedAudioStreamIndex = audioIndexParam !== undefined && /^\d+$/.test(String(audioIndexParam)) ? Number(audioIndexParam) : null;
  const mediaSourceId = typeof req.query.mediaSourceId === 'string' && /^[0-9a-f-]{32,36}$/i.test(req.query.mediaSourceId)
    ? req.query.mediaSourceId
    : null;
  const replacesPlaySessionId = typeof req.query.replacesPlaySessionId === 'string' && /^[\w-]{1,128}$/.test(req.query.replacesPlaySessionId)
    ? req.query.replacesPlaySessionId
    : null;
  const requestedAudioLanguage = typeof req.query.audioLanguage === 'string' && /^[a-z]{2,3}$/i.test(req.query.audioLanguage)
    ? req.query.audioLanguage.toLowerCase()
    : null;

  if (!['auto', 'hls'].includes(requestedMode)) {
    return res.status(400).json({ error: 'Unbekannter Wiedergabemodus' });
  }

  if (!isValidQualityProfile(requestedQualityProfile)) {
    return res.status(400).json({ error: 'Unbekannte Qualitätsstufe' });
  }

  try {
    const userAgent = req.headers['user-agent'] || '';
    const shouldForceHls = requestedMode === 'hls' || forcesHls(userAgent);

    if (requestedQualityProfile === 'direct' && shouldForceHls) {
      return res.status(400).json({ error: 'Direkte Wiedergabe ist auf diesem Server abgeschaltet' });
    }

    const qualityConstraints = getQualityConstraints(requestedQualityProfile);
    const infoOptions = {
      userAgent,
      forceHlsTranscoding: shouldForceHls,
      maxStreamingBitrate: qualityConstraints?.maxStreamingBitrate ?? null,
      maxHeight: qualityConstraints?.maxHeight ?? null,
      audioStreamIndex: requestedAudioStreamIndex,
      mediaSourceId
    };
    let playbackInfo = await PlaybackApiService.getPlaybackInfo(userId, accessToken, id, infoOptions);
    let audioStreamIndex = requestedAudioStreamIndex;

    // A remembered language (no explicit track yet): if this source has a
    // track in it other than its default, ask again with that track, so the
    // stream starts in the right language instead of switching after start.
    if (audioStreamIndex === null && requestedAudioLanguage) {
      const source = playbackInfo?.MediaSources?.[0];
      const preferred = pickAudioStreamIndex(source, requestedAudioLanguage);
      if (preferred !== null && preferred !== source?.DefaultAudioStreamIndex) {
        playbackInfo = await PlaybackApiService.getPlaybackInfo(userId, accessToken, id, {
          ...infoOptions,
          audioStreamIndex: preferred,
          mediaSourceId: source?.Id || null
        });
        audioStreamIndex = preferred;
      }
    }

    const playback = PlaybackService.resolvePlayback(playbackInfo, id, {
      forceHlsTranscoding: shouldForceHls,
      requestedQualityProfile,
      audioStreamIndex
    });

    // One login is one device (see stream-session.service.js).
    const deviceId = req.session.deviceId || req.sessionID || null;
    let replaced;
    try {
      replaced = streamSessionService.reserve({ userId, username, itemId: id, playSessionId: playback.playSessionId, replacesPlaySessionId, deviceId, userAgent });
    } catch (limitError) {
      if (limitError.code === 'STREAM_LIMIT_REACHED') {
        stopEncodings(accessToken, limitError.replaced);
        return res.status(429).json({
          error: limitError.message,
          code: limitError.code,
          limit: limitError.limit,
          activeStreams: limitError.activeStreams
        });
      }
      throw limitError;
    }

    // Quality, audio track or HLS fallback, or a player this device left
    // before it started: the streams being replaced are dead weight on the
    // Jellyfin server from here on.
    stopEncodings(accessToken, [replacesPlaySessionId, ...(replaced || [])].filter(sessionId => sessionId !== playback.playSessionId));

    res.setHeader('Cache-Control', 'no-store');
    return res.json(playback);
  } catch (error) {
    console.error(`[Playback Resolve Error] Failed to resolve playback for ${id}:`, error.message);
    if (isUpstreamUnauthorized(error)) {
      return destroyInvalidSession(req, res);
    }
    return res.status(500).json({ error: 'Wiedergabequelle konnte nicht ermittelt werden' });
  }
}));

export default router;
