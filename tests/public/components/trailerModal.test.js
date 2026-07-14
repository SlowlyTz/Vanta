import { describe, it, expect } from 'vitest';
import { extractYouTubeVideoId } from '../../../src/public/js/components/trailerModal.js';

describe('extractYouTubeVideoId', () => {
  it('extracts the id from a standard watch URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=abc123')).toBe('abc123');
  });

  it('extracts the id from a youtu.be short link', () => {
    expect(extractYouTubeVideoId('https://youtu.be/abc123')).toBe('abc123');
  });

  it('extracts the id from an embed URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/abc123')).toBe('abc123');
  });

  it('extracts the id from a shorts URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/abc123')).toBe('abc123');
  });

  it('extracts the id from a youtube-nocookie embed URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube-nocookie.com/embed/abc123')).toBe('abc123');
  });

  it('returns null for non-YouTube URLs', () => {
    expect(extractYouTubeVideoId('https://vimeo.com/12345')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(extractYouTubeVideoId('not a url')).toBeNull();
    expect(extractYouTubeVideoId(null)).toBeNull();
    expect(extractYouTubeVideoId(undefined)).toBeNull();
    expect(extractYouTubeVideoId('')).toBeNull();
  });
});
