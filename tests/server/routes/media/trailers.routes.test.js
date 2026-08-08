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
import { TrailersService } from '../../../../src/server/services/jellyfin/trailers.service.js';

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

// One session object shared by every request, the way express-session behaves for a single
// browser. Without it the feed id could never survive from one request to the next.
function createApp(session = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = Object.assign(session, {
      userId: 'test-user',
      accessToken: 'test-token'
    });
    next();
  });
  app.use('/', trailerRoutes);
  return app;
}

function createLibrary(count) {
  return Array.from({ length: count }, (_, i) =>
    createBaseItem({
      Id: `id-${i}`,
      RemoteTrailers: [{ Url: `https://youtu.be/dQw4w9WgX${String(i).padStart(3, '0')}` }]
    })
  );
}

describe('Trailer Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TrailersService.clearCatalogCache();
  });

  describe('GET /trailers', () => {
    it('returns paginated trailers together with a feed id', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createLibrary(5));

      const app = createApp();
      const res = await request(app).get('/trailers?limit=2');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.hasMore).toBe(true);
      expect(res.body.nextCursor).toBe('2');
      expect(res.body.feedId).toEqual(expect.any(String));
    });

    it('keeps the order while the client sends the feed id back', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createLibrary(20));

      const app = createApp();
      const first = await request(app).get('/trailers?limit=20');
      const again = await request(app).get(`/trailers?limit=20&feedId=${first.body.feedId}&cursor=0`);

      expect(again.body.feedId).toBe(first.body.feedId);
      expect(again.body.items.map((item) => item.id)).toEqual(first.body.items.map((item) => item.id));
    });

    it('shuffles a new feed when the client sends no feed id', async () => {
      LibraryService.getAllMoviesAndSeries.mockResolvedValue(createLibrary(40));

      const app = createApp();
      const first = await request(app).get('/trailers?limit=20');
      const reloaded = await request(app).get('/trailers?limit=20');

      expect(reloaded.body.feedId).not.toBe(first.body.feedId);
      expect(reloaded.body.items.map((item) => item.id))
        .not.toEqual(first.body.items.map((item) => item.id));
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
