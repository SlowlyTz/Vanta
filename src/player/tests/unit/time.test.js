import { describe, it, expect } from 'vitest';
import { toTicks, fromTicks, clampPosition } from '../../src/time.js';

describe('time helpers', () => {
  describe('toTicks', () => {
    it('converts seconds to Jellyfin ticks', () => {
      expect(toTicks(0)).toBe(0);
      expect(toTicks(1)).toBe(10_000_000);
      expect(toTicks(1.5)).toBe(15_000_000);
      expect(toTicks(123.456789)).toBe(1_234_567_890);
    });

    it('clamps negative and invalid values to 0', () => {
      expect(toTicks(-5)).toBe(0);
      expect(toTicks(NaN)).toBe(0);
      expect(toTicks(null)).toBe(0);
      expect(toTicks(undefined)).toBe(0);
    });
  });

  describe('fromTicks', () => {
    it('converts ticks to seconds', () => {
      expect(fromTicks(0)).toBe(0);
      expect(fromTicks(10_000_000)).toBe(1);
      expect(fromTicks(15_000_000)).toBe(1.5);
    });

    it('clamps invalid values to 0', () => {
      expect(fromTicks(-1)).toBe(0);
      expect(fromTicks(NaN)).toBe(0);
    });
  });

  describe('clampPosition', () => {
    it('clamps inside known duration', () => {
      expect(clampPosition(5, 100, 0.25)).toBe(5);
      expect(clampPosition(99.8, 100, 0.25)).toBe(99.75);
      expect(clampPosition(200, 100, 0.25)).toBe(99.75);
    });

    it('returns safe position when duration is unknown or infinite', () => {
      expect(clampPosition(5, NaN)).toBe(5);
      expect(clampPosition(5, Infinity)).toBe(5);
      expect(clampPosition(5, 0)).toBe(5);
      expect(clampPosition(-3, NaN)).toBe(0);
    });

    it('ignores negative epsilon', () => {
      expect(clampPosition(99, 100, -5)).toBe(99);
    });
  });
});
