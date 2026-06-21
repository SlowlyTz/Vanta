import { JELLYFIN_BASE_URL, jellyfinFetch, jellyfinJson } from './client.js';
import { buildBrowserDeviceProfile } from './fields.js';

export class PlaybackApiService {
  static async fetchVideoStream(itemId, token, rangeHeader) {
    const url = `${JELLYFIN_BASE_URL}/Videos/${itemId}/stream?container=mp4&videoCodec=h264&audioCodec=aac&audioChannels=2&maxBitrate=100000000&videoBitrate=40000000&audioBitrate=320000&api_key=${token}`;
    const headers = {};
    if (rangeHeader) headers.Range = rangeHeader;

    return fetch(url, { method: 'GET', headers });
  }

  static async getPlaybackInfo(userId, token, itemId, { userAgent = '', forceHlsTranscoding = false } = {}) {
    const deviceProfile = buildBrowserDeviceProfile({ forceHlsTranscoding });

    const forceHlsBody = {
      UserId: userId,
      MaxStreamingBitrate: 40000000,
      MaxAudioChannels: 2,
      EnableDirectPlay: false,
      EnableDirectStream: false,
      EnableTranscoding: true,
      AllowVideoStreamCopy: false,
      AllowAudioStreamCopy: false,
      AutoOpenLiveStream: true,
      DeviceProfile: deviceProfile
    };

    const neutralBody = {
      UserId: userId,
      MaxStreamingBitrate: 40000000,
      MaxAudioChannels: 2,
      EnableDirectPlay: true,
      EnableDirectStream: true,
      EnableTranscoding: true,
      AllowVideoStreamCopy: true,
      AllowAudioStreamCopy: true,
      AutoOpenLiveStream: true,
      DeviceProfile: deviceProfile
    };

    return jellyfinJson(`/Items/${itemId}/PlaybackInfo`, {
      token,
      method: 'POST',
      query: { UserId: userId },
      body: forceHlsTranscoding ? forceHlsBody : neutralBody
    });
  }

  static async fetchPlaybackResource(pathOrUrl, token, rangeHeader) {
    const url = new URL(pathOrUrl, JELLYFIN_BASE_URL);
    url.searchParams.set('api_key', token);

    const headers = { 'X-Emby-Authorization': `MediaBrowser Client="VANTA", Device="Web Browser", DeviceId="vanta-web-client-id", Version="1.0.0", Token="${token}"` };
    if (rangeHeader) headers.Range = rangeHeader;

    return fetch(url, { method: 'GET', headers });
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

  static markPlayed(userId, token, itemId) {
    return jellyfinFetch(`/Users/${encodeURIComponent(userId)}/PlayedItems/${encodeURIComponent(itemId)}`, {
      token,
      method: 'POST'
    });
  }
}
