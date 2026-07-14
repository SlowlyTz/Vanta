import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { enterSmartphoneFullscreen, isLandscape, isSmartphone, requestFullscreen } from '../../../src/player/src/orientation.js';

describe('orientation', () => {
  let originalNavigator;
  let originalScreen;
  let originalWindow;
  let originalDocument;

  beforeEach(() => {
    originalNavigator = global.navigator;
    originalScreen = global.screen;
    originalWindow = global.window;
    originalDocument = global.document;
  });

  afterEach(() => {
    vi.stubGlobal('navigator', originalNavigator);
    vi.stubGlobal('screen', originalScreen);
    vi.stubGlobal('window', originalWindow);
    vi.stubGlobal('document', originalDocument);
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

    it('fällt auf Viewport-Maße zurück, wenn kein Winkel verfügbar ist', () => {
      vi.stubGlobal('screen', { orientation: {} });
      vi.stubGlobal('window', { innerWidth: 844, innerHeight: 390 });

      expect(isLandscape()).toBe(true);
    });
  });

  describe('enterSmartphoneFullscreen', () => {
    it('ruft auf iOS keinen nativen video.webkitEnterFullscreen Fallback auf', async () => {
      const webkitEnterFullscreen = vi.fn();
      const lock = vi.fn(() => Promise.resolve());
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        maxTouchPoints: 5,
        platform: 'iPhone'
      });
      vi.stubGlobal('screen', { orientation: { angle: 90, lock } });
      vi.stubGlobal('window', {});

      const root = {
        requestFullscreen: undefined,
        webkitRequestFullscreen: undefined,
        querySelector: selector => (selector === 'video' ? { webkitEnterFullscreen } : null)
      };

      await enterSmartphoneFullscreen({ root, onError: vi.fn() });

      expect(webkitEnterFullscreen).not.toHaveBeenCalled();
      expect(lock).toHaveBeenCalledWith('landscape');
    });
  });

  describe('requestFullscreen', () => {
    it('nutzt auf iOS nicht video.webkitEnterFullscreen als Fallback', async () => {
      const webkitEnterFullscreen = vi.fn();
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        maxTouchPoints: 5,
        platform: 'iPhone'
      });
      vi.stubGlobal('document', {
        fullscreenElement: null,
        webkitFullscreenElement: null
      });

      const root = {
        requestFullscreen: undefined,
        webkitRequestFullscreen: undefined,
        querySelector: selector => (selector === 'video' ? { webkitEnterFullscreen } : null)
      };

      await expect(requestFullscreen(root)).rejects.toThrow('Fullscreen not supported');
      expect(webkitEnterFullscreen).not.toHaveBeenCalled();
    });
  });
});
