import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/server/services/jellyfin/client.js', async importOriginal => ({
  ...(await importOriginal()),
  jellyfinJson: vi.fn().mockResolvedValue({})
}));

import { jellyfinJson } from '../../../src/server/services/jellyfin/client.js';
import { PlaybackApiService } from '../../../src/server/services/jellyfin/playback-api.service.js';

describe('PlaybackApiService.getPlaybackInfo', () => {
  it('nennt zur gewählten Tonspur die Quelle, sonst übergeht Jellyfin die Wahl', async () => {
    await PlaybackApiService.getPlaybackInfo('u1', 't', 'item-1', { audioStreamIndex: 2 });
    expect(jellyfinJson.mock.calls.at(-1)[1].body).toMatchObject({ AudioStreamIndex: 2, MediaSourceId: 'item-1' });

    await PlaybackApiService.getPlaybackInfo('u1', 't', 'item-1', { audioStreamIndex: 3, mediaSourceId: 'source-9' });
    expect(jellyfinJson.mock.calls.at(-1)[1].body).toMatchObject({ AudioStreamIndex: 3, MediaSourceId: 'source-9' });

    await PlaybackApiService.getPlaybackInfo('u1', 't', 'item-1');
    expect(jellyfinJson.mock.calls.at(-1)[1].body).not.toHaveProperty('MediaSourceId');
  });

  it('erlaubt Stream-Copy auch bei erzwungenem HLS, damit H.264 nicht neu kodiert wird', async () => {
    await PlaybackApiService.getPlaybackInfo('u1', 't', 'item-1', { forceHlsTranscoding: true, maxHeight: 720 });
    const body = jellyfinJson.mock.calls.at(-1)[1].body;
    expect(body).toMatchObject({
      EnableDirectPlay: false,
      EnableDirectStream: false,
      AllowVideoStreamCopy: true,
      AllowAudioStreamCopy: true
    });
    expect(body.DeviceProfile.CodecProfiles[0].Conditions).toContainEqual(expect.objectContaining({ Property: 'Height', Value: '720' }));
  });

  it('lets Samsung and LG TVs play HEVC, AC3 and MKV themselves', async () => {
    const tizen = 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/76.0 TV Safari/537.36';
    await PlaybackApiService.getPlaybackInfo('u1', 't', 'item-1', { userAgent: tizen });
    const body = jellyfinJson.mock.calls.at(-1)[1].body;
    expect(body.DeviceProfile.Name).toBe('VANTA TV (tizen)');
    expect(body.DeviceProfile.DirectPlayProfiles[0]).toMatchObject({ Container: expect.stringContaining('mkv'), VideoCodec: 'h264,hevc', AudioCodec: expect.stringContaining('eac3') });
    expect(body.DeviceProfile.CodecProfiles.map(profile => profile.Codec)).toEqual(['h264', 'hevc']);
    expect(body.MaxAudioChannels).toBe(6);
  });

  it('keeps the browser profile everywhere else, also on Android TV', async () => {
    await PlaybackApiService.getPlaybackInfo('u1', 't', 'item-1', { userAgent: 'Mozilla/5.0 (Linux; Android 11; SHIELD Android TV) Chrome/120.0 Safari/537.36' });
    const body = jellyfinJson.mock.calls.at(-1)[1].body;
    expect(body.DeviceProfile.Name).toBe('VANTA HTML5');
    expect(body.MaxAudioChannels).toBe(2);
  });

  it('sends nothing to play directly when HLS is forced, even on a TV', async () => {
    await PlaybackApiService.getPlaybackInfo('u1', 't', 'item-1', { userAgent: 'Mozilla/5.0 (Web0S; Linux/SmartTV) Chrome/79.0 Safari/537.36', forceHlsTranscoding: true });
    expect(jellyfinJson.mock.calls.at(-1)[1].body.DeviceProfile.DirectPlayProfiles).toEqual([]);
  });
});
