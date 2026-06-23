import { describe, it, expect } from 'vitest';
import { buildBrowserDeviceProfile } from './fields.js';

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
});
