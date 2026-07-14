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

    it('moves a target trailer to the start of the queue', async () => {
      const req = {
        session: {
          trailerQueue: [
            { id: 'first:youtube-001', itemId: 'first' },
            { id: 'target:youtube-002', itemId: 'target' },
            { id: 'last:youtube-003', itemId: 'last' }
          ]
        }
      };

      const result = await TrailersService.getTrailerPage(
        req,
        'user',
        'token',
        0,
        2,
        false,
        'target:youtube-002'
      );

      expect(result.items.map((item) => item.id)).toEqual(['target:youtube-002', 'first:youtube-001']);
      expect(req.session.trailerQueue.map((item) => item.id)).toEqual([
        'target:youtube-002',
        'first:youtube-001',
        'last:youtube-003'
      ]);
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
