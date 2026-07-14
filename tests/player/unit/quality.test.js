import { describe, it, expect } from 'vitest';
import { sortQualityProfiles, formatProfileLabel, formatBitrate } from '../../../src/player/src/quality.js';

describe('quality', () => {
  describe('sortQualityProfiles', () => {
    it('orders auto, direct, then descending resolutions', () => {
      const profiles = [
        { id: '720p' },
        { id: 'auto' },
        { id: '360p' },
        { id: 'direct' },
        { id: '1080p' }
      ];

      const sorted = sortQualityProfiles(profiles);
      expect(sorted.map(p => p.id)).toEqual(['auto', 'direct', '1080p', '720p', '360p']);
    });
  });

  describe('formatProfileLabel', () => {
    it('formats auto and direct profiles', () => {
      expect(formatProfileLabel({ id: 'auto', label: 'Auto' })).toBe('Auto');
      expect(formatProfileLabel({ id: 'direct', label: 'Direct Play' })).toBe('Direct Play');
    });

    it('includes bitrate for resolution profiles', () => {
      expect(formatProfileLabel({ id: '720p', label: '720p', maxStreamingBitrate: 4_000_000 }))
        .toBe('720p (4 Mbit/s)');
      expect(formatProfileLabel({ id: '480p', label: '480p', maxStreamingBitrate: 2_000_000 }))
        .toBe('480p (2 Mbit/s)');
    });
  });

  describe('formatBitrate', () => {
    it('returns empty string for missing bitrate', () => {
      expect(formatBitrate(null)).toBe('');
      expect(formatBitrate(0)).toBe('');
    });

    it('formats megabits and kilobits', () => {
      expect(formatBitrate(8_000_000)).toBe('8 Mbit/s');
      expect(formatBitrate(500_000)).toBe('500 kbit/s');
    });
  });
});
