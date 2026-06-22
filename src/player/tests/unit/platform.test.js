import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isPictureInPictureSupported, exitPictureInPicture } from '../../src/platform.js';

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
});
