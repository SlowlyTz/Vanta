import { JELLYFIN_BASE_URL, deviceIdForToken, getAuthHeader, jellyfinFetch, jellyfinJson } from './client.js';
import { buildBrowserDeviceProfile } from './fields.js';

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

    return jellyfinJson(`/Items/${itemId}/PlaybackInfo`, {
      token,
      method: 'POST',
      query: { UserId: userId },
      body: baseBody
    });
  }

  static async fetchPlaybackResource(pathOrUrl, token, rangeHeader, { signal } = {}) {
    const url = new URL(pathOrUrl, JELLYFIN_BASE_URL);
    url.searchParams.set('api_key', token);

    const headers = { 'X-Emby-Authorization': getAuthHeader(token) };
    if (rangeHeader) headers.Range = rangeHeader;

    return fetch(url, { method: 'GET', headers, signal });
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
