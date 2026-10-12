import { AUTH_HEADER_NAME, JELLYFIN_BASE_URL, deviceIdForToken, getAuthHeader, jellyfinFetch, jellyfinJson } from './client.js';
import { buildBrowserDeviceProfile } from './fields.js';

export const PLAYBACK_HEADER_TIMEOUT_MS = 45 * 1000;

export class PlaybackApiService {
  static async getPlaybackInfo(userId, token, itemId, {
    userAgent = '',
    forceHlsTranscoding = false,
    maxStreamingBitrate = null,
    maxHeight = null,
    audioStreamIndex = null,
    mediaSourceId = null
  } = {}) {
    const deviceProfile = buildBrowserDeviceProfile({ forceHlsTranscoding, maxHeight });

    const baseBody = {
      UserId: userId,
      MaxStreamingBitrate: maxStreamingBitrate ?? 40_000_000,
      MaxAudioChannels: 2,
      EnableDirectPlay: !forceHlsTranscoding,
      EnableDirectStream: !forceHlsTranscoding,
      EnableTranscoding: true,
      // Even when every stream goes out as HLS, a browser-ready video or audio
      // stream is copied into the segments rather than re-encoded: encoding
      // on the CPU is what makes streaming expensive.
      AllowVideoStreamCopy: true,
      AllowAudioStreamCopy: true,
      AutoOpenLiveStream: true,
      DeviceProfile: deviceProfile
    };
    // Jellyfin ignores AudioStreamIndex unless the media source is named too
    // (it then transcodes its default track); items with one source use the
    // item id as the source id.
    if (Number.isInteger(audioStreamIndex)) {
      baseBody.AudioStreamIndex = audioStreamIndex;
      baseBody.MediaSourceId = mediaSourceId || itemId;
    }

    // Opening a media source can probe the file first, which takes a while.
    return jellyfinJson(`/Items/${itemId}/PlaybackInfo`, {
      token,
      timeoutMs: 30 * 1000,
      method: 'POST',
      query: { UserId: userId },
      body: baseBody
    });
  }

  // Only the wait for Jellyfin's answer is limited: a transcoded segment can
  // take a while to be encoded, but once the stream flows a film runs for
  // hours and must never be cut off by a timer.
  static async fetchPlaybackResource(pathOrUrl, token, rangeHeader, { signal, headerTimeoutMs = PLAYBACK_HEADER_TIMEOUT_MS } = {}) {
    // The token goes in the header only; `api_key` in the URL is a legacy
    // form Jellyfin 12 refuses (and the proxy strips it from client paths).
    const url = new URL(pathOrUrl, JELLYFIN_BASE_URL);
    const headers = { [AUTH_HEADER_NAME]: getAuthHeader(token) };
    if (rangeHeader) headers.Range = rangeHeader;

    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(signal.reason);
    if (signal?.aborted) controller.abort(signal.reason);
    else signal?.addEventListener('abort', abortFromCaller, { once: true });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, headerTimeoutMs);

    try {
      return await fetch(url, { method: 'GET', headers, signal: controller.signal });
    } catch (error) {
      if (!timedOut) throw error;
      const timeoutError = new Error(`Jellyfin did not answer ${url.pathname} within ${headerTimeoutMs} ms`);
      timeoutError.status = 504;
      throw timeoutError;
    } finally {
      clearTimeout(timer);
    }
  }

  // Ends the ffmpeg job behind a play session right away; without this a
  // stream the player has swapped out keeps encoding until Jellyfin's idle
  // timer notices.
  static stopEncoding(token, playSessionId) {
    return jellyfinFetch('/Videos/ActiveEncodings', {
      token,
      method: 'DELETE',
      query: { deviceId: deviceIdForToken(token), playSessionId }
    });
  }

  static reportPlayback(token, event, payload) {
    const endpoint = {
      start: '/Sessions/Playing',
      progress: '/Sessions/Playing/Progress',
      stopped: '/Sessions/Playing/Stopped',
      ended: '/Sessions/Playing/Stopped'
    }[event];

    if (!endpoint) {
      const error = new Error(`Unsupported playback report event: ${event}`);
      error.status = 400;
      throw error;
    }

    return jellyfinFetch(endpoint, {
      token,
      method: 'POST',
      body: payload
    });
  }

  // Jellyfin's own "mark played": POST sets Played, bumps PlayCount and resets
  // the position; DELETE clears it. Both answer with the item's UserData.
  static markPlayed(userId, token, itemId) {
    return jellyfinJson(`/Users/${encodeURIComponent(userId)}/PlayedItems/${encodeURIComponent(itemId)}`, {
      token,
      method: 'POST'
    });
  }

  static markUnplayed(userId, token, itemId) {
    return jellyfinJson(`/Users/${encodeURIComponent(userId)}/PlayedItems/${encodeURIComponent(itemId)}`, {
      token,
      method: 'DELETE'
    });
  }
}
