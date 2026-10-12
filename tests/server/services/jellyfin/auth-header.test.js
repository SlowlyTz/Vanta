import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../../../src/server/config/env.js', () => ({
  default: { JELLYFIN_BASE_URL: 'http://jellyfin.test', JELLYFIN_API_KEY: 'k' }
}));

import { jellyfinRawFetch } from '../../../../src/server/services/jellyfin/client.js';
import { PlaybackApiService } from '../../../../src/server/services/jellyfin/playback-api.service.js';

// Jellyfin 12 without EnableLegacyAuthorization only takes the token from
// the standard Authorization header.
describe('Jellyfin authentication', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('sends the token in the Authorization header, never the legacy one', async () => {
    global.fetch = vi.fn(async () => ({ ok: true }));
    await jellyfinRawFetch('/Users/u1', { token: 'tok-1', deviceId: 'dev-1' });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toMatch(/^MediaBrowser Client="VANTA", .*DeviceId="dev-1".*Token="tok-1"$/);
    expect(options.headers['X-Emby-Authorization']).toBeUndefined();
  });

  it('fetches playback resources with the header and without api_key in the URL', async () => {
    global.fetch = vi.fn(async () => ({ ok: true }));
    await PlaybackApiService.fetchPlaybackResource('/videos/abc/main.m3u8?MediaSourceId=x', 'tok-2', 'bytes=0-');

    const [url, options] = global.fetch.mock.calls[0];
    expect(url.searchParams.has('api_key')).toBe(false);
    expect(url.searchParams.get('MediaSourceId')).toBe('x');
    expect(options.headers.Authorization).toContain('Token="tok-2"');
    expect(options.headers.Range).toBe('bytes=0-');
    expect(options.headers['X-Emby-Authorization']).toBeUndefined();
  });
});
