// Playback: resolving a stream, the stream proxy, progress reports and
// transcode progress.
import express from 'express';
import { PlaybackApiService } from '../../services/jellyfin/playback-api.service.js';
import { PlaybackService } from '../../services/playback.service.js';
import { streamSessionService } from '../../services/stream-session.service.js';
import { requireAuth, isUpstreamUnauthorized, destroyInvalidSession } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forwardHeaders, pipeReadable, isAbortError, upstreamAbortSignal, FORWARD_HEADERS } from './proxyHelpers.js';
import { isValidQualityProfile, getQualityConstraints } from '../../services/playback/qualityProfiles.js';
import { pickAudioStreamIndex } from '../../services/playback/audioTracks.js';
import { getTranscodeProgress } from '../../services/playback/transcodeProgress.js';
import { isTvDirectPlatform } from '../../services/jellyfin/fields.js';
import { detectTv } from '../../../public/js/shared/tvDetect.js';
import { validateIdParam } from '../../utils/ids.js';
import { buildPlaybackReport } from '../../services/playback/report.js';

const router = express.Router();

router.param('id', validateIdParam);
// 'cancel': the player was left before playback started. Jellyfin never
// heard of the session, so it gets no report (a stop would overwrite the
// resume position); only the slot and the encoding are freed.
const REPORT_EVENTS = new Set(['start', 'progress', 'stopped', 'ended', 'cancel']);
// Every stream goes out as HLS, except to a Samsung or LG TV recognised
// for sure: those play HEVC, AC3 and MKV themselves (see fields.js) and fall
// back to HLS in the player when a file does not start.
const forcesHls = userAgent => !isTvDirectPlatform(detectTv(userAgent).platform);

// Fire and forget: Jellyfin's idle timer ends a job this misses.
const stopEncodings = (token, playSessionIds = []) => {
  new Set(playSessionIds.filter(Boolean)).forEach(playSessionId => {
    PlaybackApiService.stopEncoding(token, playSessionId).catch(error => {
      console.warn(`[Playback] could not stop the encoding ${playSessionId}:`, error.message);
    });
  });
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

// What the player asks for, with everything malformed dropped.
function parsePlaybackQuery(query) {
  const pick = (value, pattern) => (typeof value === 'string' && pattern.test(value) ? value : null);
  const audioIndex = query.audioStreamIndex;
  return {
    requestedMode: String(query.mode || 'auto').toLowerCase(),
    requestedQualityProfile: String(query.qualityProfile || 'auto').toLowerCase(),
    requestedAudioStreamIndex: audioIndex !== undefined && /^\d+$/.test(String(audioIndex)) ? Number(audioIndex) : null,
    mediaSourceId: pick(query.mediaSourceId, /^[0-9a-f-]{32,36}$/i),
    replacesPlaySessionId: pick(query.replacesPlaySessionId, /^[\w-]{1,128}$/),
    requestedAudioLanguage: pick(query.audioLanguage, /^[a-z]{2,3}$/i)?.toLowerCase() || null
  };
}

// PlaybackInfo from Jellyfin. A remembered language (no explicit track yet):
// if the source has a track in it other than its default, it is asked again
// with that track, so the stream starts in the right language.
async function fetchPlaybackInfo({ userId, accessToken, id, infoOptions, audioStreamIndex, audioLanguage }) {
  const playbackInfo = await PlaybackApiService.getPlaybackInfo(userId, accessToken, id, infoOptions);
  if (audioStreamIndex !== null || !audioLanguage) return { playbackInfo, audioStreamIndex };
  const source = playbackInfo?.MediaSources?.[0];
  const preferred = pickAudioStreamIndex(source, audioLanguage);
  if (preferred === null || preferred === source?.DefaultAudioStreamIndex) return { playbackInfo, audioStreamIndex };
  return {
    playbackInfo: await PlaybackApiService.getPlaybackInfo(userId, accessToken, id, { ...infoOptions, audioStreamIndex: preferred, mediaSourceId: source?.Id || null }),
    audioStreamIndex: preferred
  };
}

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken, username } = req.session;
  const { id } = req.params;
  const {
    requestedMode, requestedQualityProfile, requestedAudioStreamIndex, mediaSourceId, replacesPlaySessionId, requestedAudioLanguage
  } = parsePlaybackQuery(req.query);

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
    const { playbackInfo, audioStreamIndex } = await fetchPlaybackInfo({
      userId, accessToken, id, infoOptions, audioStreamIndex: requestedAudioStreamIndex, audioLanguage: requestedAudioLanguage
    });

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
