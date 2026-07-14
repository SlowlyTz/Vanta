import { describe, it, expect, vi } from 'vitest';
import {
  isYouTubeUrl,
  extractYouTubeVideoId,
  findYouTubeTrailerUrl,
  normalizeTrailer
} from '../../../../../src/server/services/jellyfin/trailers.service.js';

vi.mock('../../../../../src/server/services/jellyfin/client.js', () => ({
  jellyfinJson: vi.fn()
}));

vi.mock('../../../../../src/server/services/jellyfin/library.service.js', () => ({
  LibraryService: {
    getAllMoviesAndSeries: vi.fn()
  }
}));

import { createBaseItem } from './helpers.js';

describe('isYouTubeUrl', () => {
  it('accepts common YouTube domains', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=abc123')).toBe(true);
    expect(isYouTubeUrl('https://youtu.be/abc123')).toBe(true);
    expect(isYouTubeUrl('https://www.youtube-nocookie.com/embed/abc123')).toBe(true);
  });

  it('rejects non-YouTube URLs', () => {
    expect(isYouTubeUrl('https://vimeo.com/12345')).toBe(false);
    expect(isYouTubeUrl('https://example.com/video.mp4')).toBe(false);
    expect(isYouTubeUrl('not-a-url')).toBe(false);
  });

  it('rejects empty or invalid values', () => {
    expect(isYouTubeUrl('')).toBe(false);
    expect(isYouTubeUrl(null)).toBe(false);
    expect(isYouTubeUrl(undefined)).toBe(false);
    expect(isYouTubeUrl(123)).toBe(false);
  });
});

describe('extractYouTubeVideoId', () => {
  it('extracts ID from watch URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from short URLs', () => {
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from embed URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from shorts URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from nocookie embed URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for invalid or non-YouTube URLs', () => {
    expect(extractYouTubeVideoId('https://vimeo.com/12345')).toBeNull();
    expect(extractYouTubeVideoId('https://www.youtube.com/watch')).toBeNull();
    expect(extractYouTubeVideoId('not-a-url')).toBeNull();
    expect(extractYouTubeVideoId('')).toBeNull();
  });
});

describe('findYouTubeTrailerUrl', () => {
  it('prefers RemoteTrailers', () => {
    const item = createBaseItem({
      RemoteTrailers: [{ Url: 'https://youtu.be/remote-id' }],
      ExternalUrls: [{ Url: 'https://youtu.be/external-id' }],
      TrailerUrl: 'https://youtu.be/trailer-id'
    });
    expect(findYouTubeTrailerUrl(item)).toBe('https://youtu.be/remote-id');
  });

  it('falls back to ExternalUrls', () => {
    const item = createBaseItem({
      RemoteTrailers: [{ Url: 'https://vimeo.com/123' }],
      ExternalUrls: [{ Url: 'https://youtu.be/external-id' }],
      TrailerUrl: 'https://youtu.be/trailer-id'
    });
    expect(findYouTubeTrailerUrl(item)).toBe('https://youtu.be/external-id');
  });

  it('falls back to TrailerUrl', () => {
    const item = createBaseItem({
      ExternalUrls: [{ Url: 'https://vimeo.com/123' }],
      TrailerUrl: 'https://youtu.be/trailer-id'
    });
    expect(findYouTubeTrailerUrl(item)).toBe('https://youtu.be/trailer-id');
  });

  it('returns null when no YouTube trailer is present', () => {
    const item = createBaseItem({
      RemoteTrailers: [{ Url: 'https://vimeo.com/123' }],
      ExternalUrls: [{ Url: 'https://example.com' }]
    });
    expect(findYouTubeTrailerUrl(item)).toBeNull();
  });
});

describe('normalizeTrailer', () => {
  it('normalizes a Movie with a YouTube trailer', () => {
    const item = createBaseItem({
      RemoteTrailers: [{ Url: 'https://youtu.be/dQw4w9WgXcQ' }],
      UserData: { IsFavorite: true },
      OfficialRating: 'FSK-18',
      CommunityRating: 8.5,
      CriticRating: 91
    });

    const trailer = normalizeTrailer(item);

    expect(trailer).toMatchObject({
      id: 'item-1:dQw4w9WgXcQ',
      itemId: 'item-1',
      itemType: 'Movie',
      title: 'Test Movie',
      overview: 'A test movie.',
      year: 2024,
      typeLabel: 'Film',
      fsk: 'FSK-18',
      rating: 8.5,
      criticRating: 91,
      youtubeVideoId: 'dQw4w9WgXcQ',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      isFavorite: true
    });
    expect(trailer.primaryImageTag).toBe('primary-tag');
    expect(trailer.backdropImageTag).toBe('backdrop-tag');
    expect(trailer.backdropUrl).toBeNull();
  });

  it('normalizes a Series with a YouTube trailer', () => {
    const item = createBaseItem({
      Type: 'Series',
      ExternalUrls: [{ Url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }]
    });

    const trailer = normalizeTrailer(item);
    expect(trailer.itemType).toBe('Series');
    expect(trailer.youtubeVideoId).toBe('dQw4w9WgXcQ');
  });

  it('ignores unsupported item types', () => {
    const item = createBaseItem({
      Type: 'Episode',
      RemoteTrailers: [{ Url: 'https://youtu.be/dQw4w9WgXcQ' }]
    });
    expect(normalizeTrailer(item)).toBeNull();
  });

  it('ignores items without a YouTube trailer', () => {
    const item = createBaseItem();
    expect(normalizeTrailer(item)).toBeNull();
  });

  it('ignores items with invalid YouTube IDs', () => {
    const item = createBaseItem({
      RemoteTrailers: [{ Url: 'https://youtu.be/short' }]
    });
    expect(normalizeTrailer(item)).toBeNull();
  });
});
