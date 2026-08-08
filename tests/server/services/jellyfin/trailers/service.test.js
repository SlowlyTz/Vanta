import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrailersService } from '../../../../../src/server/services/jellyfin/trailers.service.js';

vi.mock('../../../../../src/server/services/jellyfin/client.js', () => ({
  jellyfinJson: vi.fn()
}));

vi.mock('../../../../../src/server/services/jellyfin/library.service.js', () => ({
  LibraryService: {
    getAllMoviesAndSeries: vi.fn()
  }
}));

import { jellyfinJson } from '../../../../../src/server/services/jellyfin/client.js';
import { LibraryService } from '../../../../../src/server/services/jellyfin/library.service.js';
import { createBaseItem } from './helpers.js';

function createItems(count, prefix = 'id') {
  return Array.from({ length: count }, (_, i) =>
    createBaseItem({
      Id: `${prefix}-${i}`,
      RemoteTrailers: [{ Url: `https://youtu.be/dQw4w9WgX${String(i).padStart(3, '0')}` }]
    })
  );
}

describe('TrailersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TrailersService.clearCatalogCache();
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

  describe('getTrailerPage', () => {
    it('paginates the feed and returns cursor info', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createItems(5));

      const req = { session: {} };
      const result = await TrailersService.getTrailerPage(req, 'user', 'token', { cursor: 0, limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('2');
      expect(result.hasMore).toBe(true);
      expect(result.feedId).toEqual(expect.any(String));
    });

    it('indicates no more items at the end of the feed', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createItems(3));

      const req = { session: {} };
      const result = await TrailersService.getTrailerPage(req, 'user', 'token', { cursor: 1, limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });

    it('clamps limit between 1 and 20', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createItems(1));

      const req = { session: {} };
      const low = await TrailersService.getTrailerPage(req, 'user', 'token', { cursor: 0, limit: 0 });
      const high = await TrailersService.getTrailerPage(req, 'user', 'token', { cursor: 0, limit: 100 });

      expect(low.items).toHaveLength(1);
      expect(high.items).toHaveLength(1);
    });

    it('creates a brand new feed when no feed id is sent', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createItems(40));

      const req = { session: {} };
      const first = await TrailersService.getTrailerPage(req, 'user', 'token', { limit: 20 });
      const second = await TrailersService.getTrailerPage(req, 'user', 'token', { limit: 20 });

      expect(second.feedId).not.toBe(first.feedId);
      // 40 shuffled ids landing in the same order twice is effectively impossible.
      expect(second.items.map((item) => item.id)).not.toEqual(first.items.map((item) => item.id));
    });

    it('keeps the same order while the feed id matches', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createItems(6));

      const req = { session: {} };
      const first = await TrailersService.getTrailerPage(req, 'user', 'token', { limit: 3 });
      const again = await TrailersService.getTrailerPage(req, 'user', 'token', {
        feedId: first.feedId,
        cursor: 0,
        limit: 3
      });

      expect(again.feedId).toBe(first.feedId);
      expect(again.items.map((item) => item.id)).toEqual(first.items.map((item) => item.id));
    });

    it('starts a new feed when the feed id is unknown to the session', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createItems(6));

      const req = { session: {} };
      const result = await TrailersService.getTrailerPage(req, 'user', 'token', {
        feedId: 'stale-feed-id',
        limit: 3
      });

      expect(result.feedId).not.toBe('stale-feed-id');
      expect(result.items).toHaveLength(3);
    });

    it('enters the feed at the target trailer without reordering it', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createItems(10));

      const req = { session: {} };
      const feed = await TrailersService.getTrailerPage(req, 'user', 'token', { limit: 10 });
      const order = req.session.trailerFeed.order;
      const target = order[6];

      const result = await TrailersService.getTrailerPage(req, 'user', 'token', {
        feedId: feed.feedId,
        limit: 3,
        target
      });

      expect(result.items.map((item) => item.id)).toEqual(order.slice(6, 9));
      expect(req.session.trailerFeed.order).toEqual(order);
    });

    it('skips ids that vanished from the catalog instead of returning a short page', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createItems(6));

      const req = { session: {} };
      const feed = await TrailersService.getTrailerPage(req, 'user', 'token', { limit: 6 });
      const order = [...req.session.trailerFeed.order];

      TrailersService.clearCatalogCache();
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(
        createItems(6).filter((item) => !order.slice(0, 2).some((id) => id.startsWith(`${item.Id}:`)))
      );

      const result = await TrailersService.getTrailerPage(req, 'user', 'token', {
        feedId: feed.feedId,
        cursor: 0,
        limit: 3
      });

      expect(result.items).toHaveLength(3);
      expect(result.items.map((item) => item.id)).toEqual(order.slice(2, 5));
    });

    it('serves the catalog from cache within the TTL', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createItems(4));

      const req = { session: {} };
      const first = await TrailersService.getTrailerPage(req, 'user', 'token', { limit: 2 });
      await TrailersService.getTrailerPage(req, 'user', 'token', { feedId: first.feedId, cursor: 2, limit: 2 });

      expect(LibraryService.getAllMoviesAndSeries).toHaveBeenCalledTimes(1);
    });

    it('stores only the id order in the session, not the trailer objects', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createItems(3));

      const req = { session: {} };
      await TrailersService.getTrailerPage(req, 'user', 'token', { limit: 3 });

      expect(req.session.trailerQueue).toBeUndefined();
      expect(req.session.trailerFeed.order.every((id) => typeof id === 'string')).toBe(true);
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
