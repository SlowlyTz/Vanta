import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import trailerRoutes from '../../../../src/server/routes/media/trailers.routes.js';

vi.mock('../../../../src/server/services/jellyfin/library.service.js', () => ({
  LibraryService: {
    getAllMoviesAndSeries: vi.fn()
  }
}));

vi.mock('../../../../src/server/services/jellyfin/client.js', () => ({
  jellyfinJson: vi.fn()
}));

import { LibraryService } from '../../../../src/server/services/jellyfin/library.service.js';
import { jellyfinJson } from '../../../../src/server/services/jellyfin/client.js';

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

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = {
      userId: 'test-user',
      accessToken: 'test-token'
    };
    next();
  });
  app.use('/', trailerRoutes);
  return app;
}

describe('Trailer Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /trailers', () => {
    it('returns paginated trailers and stores the queue in session', async () => {
      const items = Array.from({ length: 5 }, (_, i) =>
        createBaseItem({
          Id: `id-${i}`,
          RemoteTrailers: [{ Url: `https://youtu.be/dQw4w9WgX${String(i).padStart(3, '0')}` }]
        })
      );
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(items);

      const app = createApp();
      const res = await request(app).get('/trailers?limit=2');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.hasMore).toBe(true);
      expect(res.body.nextCursor).toBe('2');
    });

    it('refreshes the queue when refresh=1 is provided', async () => {
      const initialItems = [createBaseItem({
        Id: 'cached',
        RemoteTrailers: [{ Url: 'https://youtu.be/dQw4w9WgXc0' }]
      })];
      const refreshedItems = [createBaseItem({
        Id: 'new',
        RemoteTrailers: [{ Url: 'https://youtu.be/dQw4w9WgX99' }]
      })];

      LibraryService.getAllMoviesAndSeries
        .mockResolvedValueOnce(initialItems)
        .mockResolvedValueOnce(refreshedItems);

      const app = createApp();

      const first = await request(app).get('/trailers?limit=1');
      expect(first.body.items[0].itemId).toBe('cached');

      const refreshed = await request(app).get('/trailers?limit=1&refresh=1');
      expect(refreshed.body.items[0].itemId).toBe('new');
    });
  });

  describe('POST /item/:id/favorite', () => {
    it('sets an item as favorite', async () => {
      jellyfinJson.mockResolvedValue({});

      const app = createApp();
      const res = await request(app).post('/item/item-1/favorite');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isFavorite: true });
      expect(jellyfinJson).toHaveBeenCalledWith('/Users/test-user/FavoriteItems/item-1', {
        token: 'test-token',
        method: 'POST'
      });
    });
  });

  describe('DELETE /item/:id/favorite', () => {
    it('removes an item from favorites', async () => {
      jellyfinJson.mockResolvedValue({});

      const app = createApp();
      const res = await request(app).delete('/item/item-1/favorite');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isFavorite: false });
      expect(jellyfinJson).toHaveBeenCalledWith('/Users/test-user/FavoriteItems/item-1', {
        token: 'test-token',
        method: 'DELETE'
      });
    });
  });
});
