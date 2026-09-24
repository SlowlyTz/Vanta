import { JELLYFIN_BASE_URL, jellyfinFetch, jellyfinJson } from './client.js';
import { buildBrowserDeviceProfile } from './fields.js';

export class PlaybackApiService {
  static async fetchVideoStream(itemId, token, rangeHeader, { signal } = {}) {
    const url = `${JELLYFIN_BASE_URL}/Videos/${itemId}/stream?container=mp4&videoCodec=h264&audioCodec=aac&audioChannels=2&maxBitrate=100000000&videoBitrate=40000000&audioBitrate=320000&api_key=${token}`;
    const headers = {};
    if (rangeHeader) headers.Range = rangeHeader;

    return fetch(url, { method: 'GET', headers, signal });
  }

  static async getPlaybackInfo(userId, token, itemId, {
    userAgent = '',
    forceHlsTranscoding = false,
    maxStreamingBitrate = null,
    audioStreamIndex = null
  } = {}) {
    const deviceProfile = buildBrowserDeviceProfile({ forceHlsTranscoding });

    const baseBody = {
      UserId: userId,
      MaxStreamingBitrate: maxStreamingBitrate ?? 40_000_000,
      MaxAudioChannels: 2,
      EnableDirectPlay: !forceHlsTranscoding,
      EnableDirectStream: !forceHlsTranscoding,
      EnableTranscoding: true,
      AllowVideoStreamCopy: !forceHlsTranscoding,
      AllowAudioStreamCopy: !forceHlsTranscoding,
      AutoOpenLiveStream: true,
      DeviceProfile: deviceProfile
    };
    if (Number.isInteger(audioStreamIndex)) baseBody.AudioStreamIndex = audioStreamIndex;

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

    const headers = { 'X-Emby-Authorization': `MediaBrowser Client="VANTA", Device="Web Browser", DeviceId="vanta-web-client-id", Version="1.0.0", Token="${token}"` };
    if (rangeHeader) headers.Range = rangeHeader;

    return fetch(url, { method: 'GET', headers, signal });
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
