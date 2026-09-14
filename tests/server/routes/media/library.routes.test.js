import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import libraryRoutes from '../../../../src/server/routes/media/library.routes.js';

vi.mock('../../../../src/server/services/jellyfin/library.service.js', () => ({
  LibraryService: {
    getLibrary: vi.fn(),
    getLibraryByPublisher: vi.fn()
  }
}));

vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({
  ItemsService: {}
}));

vi.mock('../../../../src/server/services/jellyfin/playback-api.service.js', () => ({
  PlaybackApiService: {
    markPlayed: vi.fn(),
    markUnplayed: vi.fn()
  }
}));

vi.mock('../../../../src/server/services/home-categories.service.js', () => ({
  HomeCategoriesService: {}
}));

vi.mock('../../../../src/server/services/home-sections.service.js', () => ({
  HomeSectionsService: {}
}));

import { LibraryService } from '../../../../src/server/services/jellyfin/library.service.js';
import { PlaybackApiService } from '../../../../src/server/services/jellyfin/playback-api.service.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = {
      userId: 'test-user',
      accessToken: 'test-token',
      destroy: vi.fn((cb) => cb(null))
    };
    next();
  });
  app.use('/', libraryRoutes);
  return app;
}

describe('Library Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /library', () => {
    it('requires a type', async () => {
      const res = await request(createApp()).get('/library');
      expect(res.status).toBe(400);
    });

    it('uses the exact studio filter when studio is provided', async () => {
      LibraryService.getLibrary.mockResolvedValue({ items: [{ Id: '1' }], totalRecordCount: 1 });

      const res = await request(createApp()).get('/library?type=Movie&studio=Warner%20Bros.%20Pictures');

      expect(res.status).toBe(200);
      expect(LibraryService.getLibrary).toHaveBeenCalledWith('test-user', 'test-token', 'Movie', undefined, 'Warner Bros. Pictures', 1, 50);
      expect(LibraryService.getLibraryByPublisher).not.toHaveBeenCalled();
    });

    it('uses the publisher group filter when publisher is provided', async () => {
      LibraryService.getLibraryByPublisher.mockResolvedValue({ items: [{ Id: '1' }, { Id: '2' }], totalRecordCount: 2 });

      const res = await request(createApp()).get('/library?type=Movie,Series&publisher=warner-bros');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        items: [{ Id: '1' }, { Id: '2' }],
        totalItems: 2,
        page: 1,
        limit: 50,
        totalPages: 1
      });
      expect(LibraryService.getLibraryByPublisher).toHaveBeenCalledWith('test-user', 'test-token', 'Movie,Series', 'warner-bros', undefined, 1, 50);
      expect(LibraryService.getLibrary).not.toHaveBeenCalled();
    });

    it('rejects requests that combine studio and publisher', async () => {
      const res = await request(createApp()).get('/library?type=Movie&studio=Warner%20Bros&publisher=warner-bros');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/either studio or publisher/i);
      expect(LibraryService.getLibrary).not.toHaveBeenCalled();
      expect(LibraryService.getLibraryByPublisher).not.toHaveBeenCalled();
    });

    it('returns 400 for an unknown publisher id', async () => {
      const error = new Error('Unknown publisher: not-a-publisher');
      error.status = 400;
      LibraryService.getLibraryByPublisher.mockRejectedValue(error);

      const res = await request(createApp()).get('/library?type=Movie&publisher=not-a-publisher');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/unknown publisher/i);
    });

    it('destroys the session when Jellyfin returns 401', async () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      LibraryService.getLibrary.mockRejectedValue(error);

      const res = await request(createApp()).get('/library?type=Movie');

      expect(res.status).toBe(401);
    });
  });

  describe('/item/:id/played', () => {
    it('marks an item as played through Jellyfin and returns its user data', async () => {
      PlaybackApiService.markPlayed.mockResolvedValue({ Played: true, PlayCount: 1 });

      const res = await request(createApp()).post('/item/item-1/played');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ played: true, userData: { Played: true, PlayCount: 1 } });
      expect(PlaybackApiService.markPlayed).toHaveBeenCalledWith('test-user', 'test-token', 'item-1');
    });

    it('marks an item as unplayed', async () => {
      PlaybackApiService.markUnplayed.mockResolvedValue({ Played: false });

      const res = await request(createApp()).delete('/item/item-1/played');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ played: false, userData: { Played: false } });
      expect(PlaybackApiService.markUnplayed).toHaveBeenCalledWith('test-user', 'test-token', 'item-1');
    });

    it('answers 500 when Jellyfin fails', async () => {
      PlaybackApiService.markPlayed.mockRejectedValue(new Error('boom'));

      const res = await request(createApp()).post('/item/item-1/played');

      expect(res.status).toBe(500);
    });
  });
});
