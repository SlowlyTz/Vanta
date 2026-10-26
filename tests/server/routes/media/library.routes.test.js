import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import libraryRoutes, { parseSearchFilters } from '../../../../src/server/routes/media/library.routes.js';

vi.mock('../../../../src/server/services/browse/library.service.js', () => ({
  LibraryService: {
    getLibrary: vi.fn(),
    getLibraryByPublisher: vi.fn(),
    searchFull: vi.fn()
  }
}));

vi.mock('../../../../src/server/services/user-data.service.js', () => ({
  UserDataService: { forItems: vi.fn(), forget: vi.fn() }
}));

vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({ queryUserItems: vi.fn(async () => ({ Items: [] })),
  ItemsService: {}
}));

vi.mock('../../../../src/server/services/jellyfin/playback-api.service.js', () => ({
  PlaybackApiService: {
    markPlayed: vi.fn(),
    markUnplayed: vi.fn()
  }
}));

vi.mock('../../../../src/server/services/browse/home-sections.service.js', () => ({
  HomeSectionsService: {}
}));

import { LibraryService } from '../../../../src/server/services/browse/library.service.js';
import { PlaybackApiService } from '../../../../src/server/services/jellyfin/playback-api.service.js';
import { UserDataService } from '../../../../src/server/services/user-data.service.js';

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

    it('serves a restored list of up to 720 titles in one page, no more', async () => {
      LibraryService.getLibrary.mockResolvedValue({ items: [], totalRecordCount: 0 });

      await request(createApp()).get('/library?type=Movie&page=1&limit=108');
      expect(LibraryService.getLibrary).toHaveBeenLastCalledWith('test-user', 'test-token', 'Movie', undefined, undefined, 1, 108);

      await request(createApp()).get('/library?type=Movie&page=1&limit=5000');
      expect(LibraryService.getLibrary).toHaveBeenLastCalledWith('test-user', 'test-token', 'Movie', undefined, undefined, 1, 720);
    });

    it('rejects requests that combine studio and publisher', async () => {
      const res = await request(createApp()).get('/library?type=Movie&studio=Warner%20Bros&publisher=warner-bros');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Studio oder Publisher/);
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
      expect(UserDataService.forget).toHaveBeenCalledWith('test-user');
    });

    it('marks an item as unplayed', async () => {
      PlaybackApiService.markUnplayed.mockResolvedValue({ Played: false });

      const res = await request(createApp()).delete('/item/item-1/played');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ played: false, userData: { Played: false } });
      expect(PlaybackApiService.markUnplayed).toHaveBeenCalledWith('test-user', 'test-token', 'item-1');
      expect(UserDataService.forget).toHaveBeenCalledWith('test-user');
    });

    it('answers 500 when Jellyfin fails, 404 for an unknown item', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      PlaybackApiService.markPlayed.mockRejectedValue(new Error('boom'));
      expect((await request(createApp()).post('/item/item-1/played')).status).toBe(500);

      PlaybackApiService.markUnplayed.mockRejectedValue(Object.assign(new Error('gone'), { status: 404 }));
      expect((await request(createApp()).delete('/item/item-1/played')).status).toBe(404);
      expect(UserDataService.forget).not.toHaveBeenCalled();
    });

    it('refuses ids that are no Jellyfin ids', async () => {
      expect((await request(createApp()).post('/item/a%2F..%2Fb/played')).status).toBe(400);
      expect((await request(createApp()).delete('/item/a%3Fx/played')).status).toBe(400);
      expect(PlaybackApiService.markPlayed).not.toHaveBeenCalled();
      expect(PlaybackApiService.markUnplayed).not.toHaveBeenCalled();
    });
  });
});

describe('search page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the filters and drops anything unknown', () => {
    expect(parseSearchFilters({ type: 'Movie,Episode', genre: 'Drama,Krimi', decade: '1990', fsk: '12', unwatched: '1' }))
      .toEqual({ types: ['Movie'], genres: ['Drama', 'Krimi'], decade: 1990, maxAge: 12, unwatched: true });
    expect(parseSearchFilters({ decade: '1995', fsk: '7' })).toMatchObject({ decade: null, maxAge: null, unwatched: false });
    expect(parseSearchFilters({ fsk: '0' }).maxAge).toBe(0);
  });

  it('answers titles and people, and leaves watched titles out on request', async () => {
    LibraryService.searchFull.mockResolvedValue({ items: [{ Id: 'a' }, { Id: 'b' }], people: [{ Id: 'p1' }] });
    UserDataService.forItems.mockResolvedValue({ a: { played: true }, b: { played: false } });

    const res = await request(createApp()).get('/search/full?q=heat&unwatched=1&type=Movie');

    expect(res.body).toEqual({ items: [{ Id: 'b' }], people: [{ Id: 'p1' }] });
    expect(LibraryService.searchFull).toHaveBeenCalledWith('test-user', 'test-token', 'heat', expect.objectContaining({ types: ['Movie'], unwatched: true, peopleToo: true }), { limit: 200 });
  });

  it('drops watched titles before cutting the list, and trims the query', async () => {
    const found = Array.from({ length: 150 }, (_, n) => ({ Id: `t${n}` }));
    LibraryService.searchFull.mockResolvedValue({ items: found, people: [] });
    // The first hundred are watched.
    UserDataService.forItems.mockImplementation(async (u, t, ids) => Object.fromEntries(ids.map(id => [id, { played: Number(id.slice(1)) < 100 }])));

    const res = await request(createApp()).get('/search/full?q=%20heat%20&unwatched=1');

    expect(res.body.items.map(item => item.Id)).toEqual(found.slice(100).map(item => item.Id));
    expect(LibraryService.searchFull).toHaveBeenCalledWith('test-user', 'test-token', 'heat', expect.anything(), { limit: 200 });
    expect(UserDataService.forItems.mock.calls.map(call => call[2].length)).toEqual([100, 50]);
  });

  it('shows at most 60 titles', async () => {
    LibraryService.searchFull.mockResolvedValue({ items: Array.from({ length: 80 }, (_, n) => ({ Id: `t${n}` })), people: [] });
    const res = await request(createApp()).get('/search/full?q=heat');
    expect(res.body.items).toHaveLength(60);
    expect(LibraryService.searchFull).toHaveBeenCalledWith('test-user', 'test-token', 'heat', expect.anything(), { limit: 60 });
  });

  it('needs a query or a filter', async () => {
    const res = await request(createApp()).get('/search/full?q=');
    expect(res.body).toEqual({ items: [], people: [] });
    expect(LibraryService.searchFull).not.toHaveBeenCalled();
  });

  it('lists by filter alone, without people', async () => {
    LibraryService.searchFull.mockResolvedValue({ items: [], people: [] });
    await request(createApp()).get('/search/full?genre=Drama');
    expect(LibraryService.searchFull).toHaveBeenCalledWith('test-user', 'test-token', '', expect.objectContaining({ genres: ['Drama'], peopleToo: false }), { limit: 60 });
  });
});
