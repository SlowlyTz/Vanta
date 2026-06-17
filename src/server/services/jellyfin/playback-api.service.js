import { JELLYFIN_BASE_URL, jellyfinJson, jellyfinRawFetch } from './client.js';
import { buildBrowserDeviceProfile } from './fields.js';

export class PlaybackApiService {
  static async fetchVideoStream(itemId, token, rangeHeader) {
    const url = `${JELLYFIN_BASE_URL}/Videos/${itemId}/stream?container=mp4&videoCodec=h264&audioCodec=aac&audioChannels=2&maxBitrate=100000000&videoBitrate=40000000&audioBitrate=320000&api_key=${token}`;
    const headers = {};
    if (rangeHeader) headers.Range = rangeHeader;

    return fetch(url, { method: 'GET', headers });
  }

  static async getPlaybackInfo(userId, token, itemId, options = {}) {
    const forceTranscode = options.forceTranscode === true;
    const preferHls = options.preferHls === true;

    return jellyfinJson(`/Items/${itemId}/PlaybackInfo`, {
      token,
      method: 'POST',
      query: { UserId: userId },
      body: {
        UserId: userId,
        MaxStreamingBitrate: forceTranscode ? 20000000 : 40000000,
        MaxAudioChannels: 2,
        EnableDirectPlay: !forceTranscode,
        EnableDirectStream: !forceTranscode,
        EnableTranscoding: true,
        AllowVideoStreamCopy: !forceTranscode,
        AllowAudioStreamCopy: !forceTranscode,
        AutoOpenLiveStream: true,
        DeviceProfile: buildBrowserDeviceProfile({ forceTranscode, preferHls })
      }
    });
  }

  static async fetchPlaybackResource(pathOrUrl, token, rangeHeader) {
    const url = new URL(pathOrUrl, JELLYFIN_BASE_URL);
    url.searchParams.set('api_key', token);

    const headers = { 'X-Emby-Authorization': `MediaBrowser Client="VANTA", Device="Web Browser", DeviceId="vanta-web-client-id", Version="1.0.0", Token="${token}"` };
    if (rangeHeader) headers.Range = rangeHeader;

    return fetch(url, { method: 'GET', headers });
  }
}
