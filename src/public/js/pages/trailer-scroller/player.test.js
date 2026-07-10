import { describe, it, expect } from 'vitest';
import { getYouTubeEmbedUrl } from './player.js';

describe('getYouTubeEmbedUrl', () => {
  it('keeps playback controls inside the native YouTube player', () => {
    const url = new URL(getYouTubeEmbedUrl('video-123', { autoplay: 0, mute: 1 }));

    expect(url.pathname).toBe('/embed/video-123');
    expect(url.searchParams.get('controls')).toBe('1');
    expect(url.searchParams.get('disablekb')).toBe('0');
    expect(url.searchParams.get('fs')).toBe('1');
    expect(url.searchParams.get('autoplay')).toBe('0');
    expect(url.searchParams.get('mute')).toBe('1');
    expect(url.searchParams.get('playsinline')).toBe('1');
  });
});
