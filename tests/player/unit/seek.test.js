import { describe, it, expect } from 'vitest';
import { seekTo, seekBy, clampSeekTarget, getSeekableEnd } from '../../../src/player/src/seek.js';

function createPlayer(state = {}) {
  return {
    currentTime: 0,
    duration: 100,
    seekable: {
      length: 1,
      end: () => state.seekableEnd ?? 100
    },
    ...state
  };
}

describe('seek helpers', () => {
  describe('getSeekableEnd', () => {
    it('returns the last seekable end', () => {
      expect(getSeekableEnd(createPlayer({ seekableEnd: 120 }))).toBe(120);
    });

    it('returns null for empty or invalid seekable', () => {
      expect(getSeekableEnd(createPlayer({ seekable: { length: 0 } }))).toBeNull();
      expect(getSeekableEnd(createPlayer({ seekable: null }))).toBeNull();
    });
  });

  describe('clampSeekTarget', () => {
    it('clamps to duration minus epsilon', () => {
      const player = createPlayer();
      expect(clampSeekTarget(50, player)).toBe(50);
      expect(clampSeekTarget(99.8, player)).toBe(99.75);
      expect(clampSeekTarget(200, player)).toBe(99.75);
      expect(clampSeekTarget(-5, player)).toBe(0);
    });

    it('falls back to seekable range when duration is unknown', () => {
      const player = createPlayer({ duration: NaN, seekableEnd: 80 });
      expect(clampSeekTarget(50, player)).toBe(50);
      expect(clampSeekTarget(200, player)).toBe(79.75);
    });

    it('returns target when neither duration nor seekable are available', () => {
      const player = createPlayer({ duration: NaN, seekable: { length: 0 } });
      expect(clampSeekTarget(42, player)).toBe(42);
      expect(clampSeekTarget(-5, player)).toBe(0);
    });
  });

  describe('seekTo', () => {
    it('sets currentTime to clamped target', () => {
      const player = createPlayer();
      expect(seekTo(player, 50)).toBe(50);
      expect(player.currentTime).toBe(50);
    });

    it('does not set invalid targets', () => {
      const player = createPlayer();
      seekTo(player, NaN);
      expect(player.currentTime).toBe(0);
    });
  });

  describe('seekBy', () => {
    it('seeks relative to current time', () => {
      const player = createPlayer({ currentTime: 20 });
      expect(seekBy(player, 10)).toBe(30);
      expect(player.currentTime).toBe(30);
    });

    it('clamps at the end', () => {
      const player = createPlayer({ currentTime: 95 });
      expect(seekBy(player, 10)).toBe(99.75);
    });
  });
});
