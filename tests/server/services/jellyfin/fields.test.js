import { describe, it, expect } from 'vitest';
import { buildBrowserDeviceProfile } from '../../../../src/server/services/jellyfin/fields.js';

describe('buildBrowserDeviceProfile', () => {
  it('allows external WebVTT subtitles without changing forced HLS video output', () => {
    const profile = buildBrowserDeviceProfile({ forceHlsTranscoding: true });

    expect(profile.TranscodingProfiles).toContainEqual(expect.objectContaining({
      Protocol: 'hls',
      Container: 'ts',
      VideoCodec: 'h264',
      AudioCodec: 'aac'
    }));
    expect(profile.DirectPlayProfiles).toEqual([]);
    expect(profile.SubtitleProfiles).toContainEqual({
      Format: 'vtt',
      Method: 'External'
    });
  });

  it('lets Jellyfin copy browser-ready H.264 and caps its height only for a quality profile', () => {
    const [h264] = buildBrowserDeviceProfile({ forceHlsTranscoding: true }).CodecProfiles;
    expect(h264).toMatchObject({ Type: 'Video', Codec: 'h264' });
    expect(h264.Conditions).toContainEqual(expect.objectContaining({ Property: 'VideoBitDepth', Condition: 'LessThanEqual', Value: '8' }));
    expect(h264.Conditions.some(condition => condition.Property === 'Height')).toBe(false);

    const [capped] = buildBrowserDeviceProfile({ forceHlsTranscoding: true, maxHeight: 720 }).CodecProfiles;
    expect(capped.Conditions).toContainEqual(expect.objectContaining({ Property: 'Height', Condition: 'LessThanEqual', Value: '720' }));
  });
});
