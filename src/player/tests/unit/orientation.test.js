import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isLandscape, isSmartphone } from '../../src/orientation.js';

describe('orientation', () => {
  let originalNavigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    vi.stubGlobal('navigator', originalNavigator);
  });

  describe('isSmartphone', () => {
    it('returns true for Android mobile with small screen and touch', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36',
        maxTouchPoints: 5,
        platform: 'Linux armv8l'
      });
      vi.stubGlobal('window', { screen: { width: 360, height: 760 } });
      vi.stubGlobal('screen', { width: 360, height: 760 });

      expect(isSmartphone()).toBe(true);
    });

    it('returns false for iPad tablet', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        maxTouchPoints: 5,
        platform: 'MacIntel'
      });
      vi.stubGlobal('window', { screen: { width: 768, height: 1024 } });
      vi.stubGlobal('screen', { width: 768, height: 1024 });

      expect(isSmartphone()).toBe(false);
    });

    it('returns false for desktop without touch', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        maxTouchPoints: 0,
        platform: 'Win32'
      });
      vi.stubGlobal('window', { screen: { width: 1920, height: 1080 } });
      vi.stubGlobal('screen', { width: 1920, height: 1080 });

      expect(isSmartphone()).toBe(false);
    });
  });

  describe('isLandscape', () => {
    it('detects landscape orientation from angle', () => {
      vi.stubGlobal('screen', { orientation: { angle: 90 } });
      vi.stubGlobal('window', {});
      expect(isLandscape()).toBe(true);

      vi.stubGlobal('screen', { orientation: { angle: -90 } });
      expect(isLandscape()).toBe(true);
    });

    it('detects portrait orientation', () => {
      vi.stubGlobal('screen', { orientation: { angle: 0 } });
      vi.stubGlobal('window', {});
      expect(isLandscape()).toBe(false);
    });
  });
});
