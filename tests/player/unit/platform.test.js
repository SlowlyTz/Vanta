import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  enforceInlineVideoPlayback,
  enterInlineFullscreen,
  exitInlineFullscreen,
  isInlineFullscreen,
  isPictureInPictureSupported,
  exitPictureInPicture
} from '../../../src/player/src/platform.js';

describe('platform', () => {
  let originalDocument;

  beforeEach(() => {
    originalDocument = global.document;
  });

  afterEach(() => {
    vi.stubGlobal('document', originalDocument);
  });

  describe('isPictureInPictureSupported', () => {
    it('returns true when document.pictureInPictureEnabled is true', () => {
      vi.stubGlobal('document', { pictureInPictureEnabled: true });
      expect(isPictureInPictureSupported()).toBe(true);
    });

    it('returns false when PiP is not supported', () => {
      vi.stubGlobal('document', {
        pictureInPictureEnabled: false,
        createElement: () => ({ webkitSupportsPresentationMode: false })
      });
      expect(isPictureInPictureSupported()).toBe(false);
    });
  });

  describe('exitPictureInPicture', () => {
    it('exits PiP when active', async () => {
      const exitPictureInPicture = vi.fn(() => Promise.resolve());
      vi.stubGlobal('document', {
        pictureInPictureElement: {},
        exitPictureInPicture
      });

      await exitPictureInPicture();
      expect(exitPictureInPicture).toHaveBeenCalled();
    });
  });

  describe('enforceInlineVideoPlayback', () => {
    it('setzt playsinline Attribute und Properties auf echten Video-Elementen', () => {
      const root = document.createElement('div');
      const video = document.createElement('video');
      root.appendChild(video);

      enforceInlineVideoPlayback(root);

      expect(video.hasAttribute('playsinline')).toBe(true);
      expect(video.hasAttribute('webkit-playsinline')).toBe(true);
      expect(video.playsInline).toBe(true);
      expect(video.webkitPlaysInline).toBe(true);
    });
  });

  describe('inline fullscreen helpers', () => {
    it('aktiviert und deaktiviert Custom-Inline-Fullscreen ohne Native API', () => {
      const root = document.createElement('div');

      enterInlineFullscreen(root);

      expect(isInlineFullscreen(root)).toBe(true);
      expect(root.getAttribute('data-inline-fullscreen')).toBe('true');

      exitInlineFullscreen(root);

      expect(isInlineFullscreen(root)).toBe(false);
      expect(root.hasAttribute('data-inline-fullscreen')).toBe(false);
    });
  });
});
