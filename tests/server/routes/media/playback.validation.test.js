import { describe, it, expect } from 'vitest';
import { isValidQualityProfile, getQualityConstraints } from '../../../../src/server/routes/media/playback.validation.js';

describe('playback validation helpers', () => {
  describe('isValidQualityProfile', () => {
    it('accepts supported profiles', () => {
      expect(isValidQualityProfile('auto')).toBe(true);
      expect(isValidQualityProfile('direct')).toBe(true);
      expect(isValidQualityProfile('1080p')).toBe(true);
    });

    it('rejects unsupported profiles', () => {
      expect(isValidQualityProfile('4k')).toBe(false);
      expect(isValidQualityProfile('')).toBe(false);
    });
  });

  describe('getQualityConstraints', () => {
    it('returns constraints for resolution profiles', () => {
      expect(getQualityConstraints('720p')).toEqual({
        maxHeight: 720,
        maxStreamingBitrate: 4_000_000
      });
    });

    it('returns null for auto and direct profiles', () => {
      expect(getQualityConstraints('auto')).toBeNull();
      expect(getQualityConstraints('direct')).toBeNull();
    });

    it('returns null for unknown profiles', () => {
      expect(getQualityConstraints('unknown')).toBeNull();
    });
  });
});
