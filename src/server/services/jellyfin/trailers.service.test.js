import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isYouTubeUrl,
  extractYouTubeVideoId,
  findYouTubeTrailerUrl,
  normalizeTrailer,
  TrailersService
} from './trailers.service.js';

vi.mock('./client.js', () => ({
  jellyfinJson: vi.fn()
}));

vi.mock('./library.service.js', () => ({
  LibraryService: {
    getAllMoviesAndSeries: vi.fn()
  }
}));

import { jellyfinJson } from './client.js';
import { LibraryService } from './library.service.js';

function createBaseItem(overrides = {}) {
  return {
    Id: 'item-1',
    Type: 'Movie',
    Name: 'Test Movie',
    Overview: 'A test movie.',
    ProductionYear: 2024,
    ImageTags: { Primary: 'primary-tag' },
    BackdropImageTags: ['backdrop-tag'],
    UserData: { IsFavorite: false },
    ...overrides
  };
}

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

describe('TrailersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadAllTrailerItems', () => {
    it('returns only normalized Movie/Series items with YouTube trailers', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue([
        createBaseItem({ Id: '1', RemoteTrailers: [{ Url: 'https://youtu.be/dQw4w9WgX01' }] }),
        createBaseItem({ Id: '2', Type: 'Series', RemoteTrailers: [{ Url: 'https://youtu.be/dQw4w9WgX02' }] }),
        createBaseItem({ Id: '3', Type: 'Episode', RemoteTrailers: [{ Url: 'https://youtu.be/dQw4w9WgX03' }] }),
        createBaseItem({ Id: '4' })
      ]);

      const items = await TrailersService.loadAllTrailerItems('user', 'token');

      expect(items).toHaveLength(2);
      expect(items.map((i) => i.itemId)).toContain('1');
      expect(items.map((i) => i.itemId)).toContain('2');
      expect(LibraryService.getAllMoviesAndSeries).toHaveBeenCalledWith('user', 'token', 10000);
    });
  });

  describe('getTrailerQueue', () => {
    it('loads and shuffles a new queue when none exists', async () => {
      const items = Array.from({ length: 10 }, (_, i) =>
        createBaseItem({
          Id: `id-${i}`,
          RemoteTrailers: [{ Url: `https://youtu.be/dQw4w9WgX${String(i).padStart(3, '0')}` }]
        })
      );
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(items);

      const req = { session: {} };
      const queue = await TrailersService.getTrailerQueue(req, 'user', 'token');

      expect(queue).toHaveLength(10);
      expect(req.session.trailerQueue).toBe(queue);
    });

    it('returns existing queue without hitting Jellyfin', async () => {
      const req = { session: { trailerQueue: [{ itemId: 'cached' }] } };

      const queue = await TrailersService.getTrailerQueue(req, 'user', 'token');

      expect(queue).toHaveLength(1);
      expect(LibraryService.getAllMoviesAndSeries).not.toHaveBeenCalled();
    });

    it('regenerates the queue when refresh is true', async () => {
      const req = { session: { trailerQueue: [{ itemId: 'cached' }] } };
      const items = [createBaseItem({ Id: 'new', RemoteTrailers: [{ Url: 'https://youtu.be/dQw4w9WgX99' }] })];
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(items);

      const queue = await TrailersService.getTrailerQueue(req, 'user', 'token', true);

      expect(queue).toHaveLength(1);
      expect(queue[0].itemId).toBe('new');
      expect(req.session.trailerQueue[0].itemId).toBe('new');
    });
  });

  describe('getTrailerPage', () => {
    it('paginates the queue and returns cursor info', async () => {
      const items = Array.from({ length: 5 }, (_, i) =>
        createBaseItem({
          Id: `id-${i}`,
          RemoteTrailers: [{ Url: `https://youtu.be/dQw4w9WgX${String(i).padStart(3, '0')}` }]
        })
      );
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(items);

      const req = { session: {} };
      const result = await TrailersService.getTrailerPage(req, 'user', 'token', 0, 2);

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('2');
      expect(result.hasMore).toBe(true);
    });

    it('indicates no more items at the end of the queue', async () => {
      const items = Array.from({ length: 3 }, (_, i) =>
        createBaseItem({
          Id: `id-${i}`,
          RemoteTrailers: [{ Url: `https://youtu.be/dQw4w9WgX${String(i).padStart(3, '0')}` }]
        })
      );
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(items);

      const req = { session: {} };
      const result = await TrailersService.getTrailerPage(req, 'user', 'token', 1, 2);

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });

    it('clamps limit between 1 and 20', async () => {
      const items = [createBaseItem({ Id: '1', RemoteTrailers: [{ Url: 'https://youtu.be/dQw4w9WgXcQ' }] })];
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(items);

      const req = { session: {} };
      const low = await TrailersService.getTrailerPage(req, 'user', 'token', 0, 0);
      const high = await TrailersService.getTrailerPage(req, 'user', 'token', 0, 100);

      expect(low.items).toHaveLength(1);
      expect(high.items).toHaveLength(1);
    });
  });

  describe('setFavorite', () => {
    it('calls POST to add favorite', async () => {
      jellyfinJson.mockResolvedValue({});

      const result = await TrailersService.setFavorite('user', 'token', 'item-1', true);

      expect(result).toEqual({ isFavorite: true });
      expect(jellyfinJson).toHaveBeenCalledWith('/Users/user/FavoriteItems/item-1', {
        token: 'token',
        method: 'POST'
      });
    });

    it('calls DELETE to remove favorite', async () => {
      jellyfinJson.mockResolvedValue({});

      const result = await TrailersService.setFavorite('user', 'token', 'item-1', false);

      expect(result).toEqual({ isFavorite: false });
      expect(jellyfinJson).toHaveBeenCalledWith('/Users/user/FavoriteItems/item-1', {
        token: 'token',
        method: 'DELETE'
      });
    });
  });
});
