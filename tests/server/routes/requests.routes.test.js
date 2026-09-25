import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import requestsRoutes from '../../../src/server/routes/requests.routes.js';

vi.mock('../../../src/server/services/jellyfin/auth.service.js', () => ({
  AuthService: { isUserAdmin: vi.fn() }
}));

vi.mock('../../../src/server/services/requests.service.js', () => ({
  RequestsService: {
    create: vi.fn(),
    getByUser: vi.fn(),
    getOpen: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    delete: vi.fn(),
    updateStatus: vi.fn(),
    isBanned: vi.fn(),
    getBannedMedia: vi.fn(),
    exists: vi.fn(),
    isWholeTitleRequested: vi.fn(),
    crossCheck: vi.fn(),
    getOpenScopes: vi.fn()
  }
}));

vi.mock('../../../src/server/services/tmdb.service.js', () => ({
  TmdbService: {
    search: vi.fn(),
    getMovieDetails: vi.fn(),
    getTvDetails: vi.fn(),
    getSeasonDetails: vi.fn()
  }
}));

vi.mock('../../../src/server/services/discord-webhook.service.js', () => ({
  sendRequestCreated: vi.fn()
}));

import { AuthService } from '../../../src/server/services/jellyfin/auth.service.js';
import { RequestsService } from '../../../src/server/services/requests.service.js';
import { TmdbService } from '../../../src/server/services/tmdb.service.js';
import { sendRequestCreated } from '../../../src/server/services/discord-webhook.service.js';

const TV_SEASONS = [
  { season_number: 0, name: 'Specials' },
  { season_number: 1, name: 'Staffel 1' },
  { season_number: 2, name: 'Staffel 2' }
];

const SEASON_TWO = {
  season_number: 2,
  name: 'Staffel 2',
  episodes: [
    { episode_number: 1, name: 'Beginnings and Endings', overview: 'o1', still_path: '/s1.jpg', air_date: '2019-06-21', runtime: 55 },
    { episode_number: 2, name: 'Dark Matter', overview: 'o2', still_path: '/s2.jpg', air_date: '2019-06-21', runtime: 58 }
  ]
};

function createApp({ authenticated = true } = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = authenticated
      ? { userId: 'user-1', accessToken: 'token', username: 'alice' }
      : {};
    next();
  });
  app.use('/', requestsRoutes);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

describe('Requests Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.isUserAdmin.mockResolvedValue(true);
  });

  describe('GET /admin/all', () => {
    it('is rejected without a session', async () => {
      const res = await request(createApp({ authenticated: false })).get('/admin/all');
      expect(res.status).toBe(401);
    });

    it('is rejected for non-admins', async () => {
      AuthService.isUserAdmin.mockResolvedValue(false);
      const res = await request(createApp()).get('/admin/all');
      expect(res.status).toBe(403);
    });

    it('returns every request via RequestsService.getAll, not just open ones', async () => {
      RequestsService.getAll.mockResolvedValue([
        { id: 1, status: 'pending' },
        { id: 2, status: 'rejected' }
      ]);

      const res = await request(createApp()).get('/admin/all');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 1, status: 'pending' }, { id: 2, status: 'rejected' }]);
      expect(RequestsService.getAll).toHaveBeenCalledTimes(1);
    });

    it('is registered before GET /:id, so the literal path is not swallowed by the param route', async () => {
      RequestsService.getAll.mockResolvedValue([]);

      const res = await request(createApp()).get('/admin/all');

      expect(res.status).toBe(200);
      // If /:id had matched first, RequestsService.getById would have been called with "admin/all"-ish
      // param instead, and getAll would never run.
      expect(RequestsService.getById).not.toHaveBeenCalled();
      expect(RequestsService.getAll).toHaveBeenCalled();
    });
  });

  describe('GET /admin/open still works alongside /admin/all', () => {
    it('calls getOpen', async () => {
      RequestsService.getOpen.mockResolvedValue([]);
      const res = await request(createApp()).get('/admin/open');

      expect(res.status).toBe(200);
      expect(RequestsService.getOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST / (create request)', () => {
    it('requires tmdbId and tmdbType', async () => {
      const res = await request(createApp()).post('/').send({});
      expect(res.status).toBe(400);
      expect(RequestsService.create).not.toHaveBeenCalled();
    });

    it('creates the request, responds with the request only, and triggers exactly one webhook call', async () => {
      const createdRequest = { id: 1, title: 'Inception', tmdb_id: 42, tmdb_type: 'movie' };
      const media = { overview: 'A thief...', release_date: '2010-07-16' };
      RequestsService.create.mockResolvedValue({ request: createdRequest, media });

      const res = await request(createApp()).post('/').send({ tmdbId: 42, tmdbType: 'movie' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(createdRequest);
      expect(sendRequestCreated).toHaveBeenCalledTimes(1);
      expect(sendRequestCreated).toHaveBeenCalledWith(createdRequest, media);
    });

    it('still responds successfully to the user when the webhook call fails', async () => {
      const createdRequest = { id: 2, title: 'Dark', tmdb_id: 99, tmdb_type: 'tv' };
      RequestsService.create.mockResolvedValue({ request: createdRequest, media: {} });
      sendRequestCreated.mockRejectedValue(new Error('discord unreachable'));

      const res = await request(createApp()).post('/').send({ tmdbId: 99, tmdbType: 'tv' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(createdRequest);
    });
  });

  describe('POST / (request scope)', () => {
    beforeEach(() => {
      RequestsService.create.mockResolvedValue({ request: { id: 1 }, media: {} });
      TmdbService.getTvDetails.mockResolvedValue({ id: 70523, seasons: TV_SEASONS });
      TmdbService.getSeasonDetails.mockResolvedValue(SEASON_TWO);
    });

    const post = (body) => request(createApp()).post('/').send({ tmdbId: 70523, tmdbType: 'tv', ...body });

    it('defaults to the whole title', async () => {
      const res = await post({});

      expect(res.status).toBe(201);
      expect(RequestsService.create).toHaveBeenCalledWith(
        'user-1', 'alice', 70523, 'tv', undefined,
        { scope: 'all', seasonNumber: null, episodeNumber: null }
      );
      expect(TmdbService.getTvDetails).not.toHaveBeenCalled();
    });

    it('passes a season selection on to the service', async () => {
      const res = await post({ scope: 'season', seasonNumber: 2 });

      expect(res.status).toBe(201);
      expect(RequestsService.create).toHaveBeenCalledWith(
        'user-1', 'alice', 70523, 'tv', undefined,
        { scope: 'season', seasonNumber: 2, episodeNumber: null }
      );
    });

    it('passes an episode selection on to the service', async () => {
      const res = await post({ scope: 'episode', seasonNumber: 2, episodeNumber: 2 });

      expect(res.status).toBe(201);
      expect(RequestsService.create).toHaveBeenCalledWith(
        'user-1', 'alice', 70523, 'tv', undefined,
        { scope: 'episode', seasonNumber: 2, episodeNumber: 2 }
      );
      expect(TmdbService.getSeasonDetails).toHaveBeenCalledWith(70523, 2);
    });

    it('rejects an unknown scope', async () => {
      const res = await post({ scope: 'half' });

      expect(res.status).toBe(400);
      expect(RequestsService.create).not.toHaveBeenCalled();
    });

    it('rejects any scope other than "all" for a movie', async () => {
      const res = await request(createApp()).post('/')
        .send({ tmdbId: 42, tmdbType: 'movie', scope: 'season', seasonNumber: 1 });

      expect(res.status).toBe(400);
      expect(RequestsService.create).not.toHaveBeenCalled();
    });

    it('rejects a season request without an integer season number', async () => {
      expect((await post({ scope: 'season' })).status).toBe(400);
      expect((await post({ scope: 'season', seasonNumber: 'zwei' })).status).toBe(400);
      expect(RequestsService.create).not.toHaveBeenCalled();
    });

    it('rejects an episode request without an integer episode number', async () => {
      expect((await post({ scope: 'episode', seasonNumber: 2 })).status).toBe(400);
      expect(RequestsService.create).not.toHaveBeenCalled();
    });

    it('rejects a season TMDB does not know', async () => {
      const res = await post({ scope: 'season', seasonNumber: 9 });

      expect(res.status).toBe(400);
      expect(RequestsService.create).not.toHaveBeenCalled();
    });

    it('rejects specials, which are never requestable', async () => {
      const res = await post({ scope: 'season', seasonNumber: 0 });

      expect(res.status).toBe(400);
      expect(RequestsService.create).not.toHaveBeenCalled();
    });

    it('rejects an episode the season does not contain', async () => {
      const res = await post({ scope: 'episode', seasonNumber: 2, episodeNumber: 99 });

      expect(res.status).toBe(400);
      expect(RequestsService.create).not.toHaveBeenCalled();
    });

    // getTvDetails degrades to the cached row without seasons when TMDB is down;
    // there is nothing to validate against then, so the request is let through.
    it('lets a season through when TMDB served no season list', async () => {
      TmdbService.getTvDetails.mockResolvedValue({ id: 70523, seasons: [] });

      const res = await post({ scope: 'season', seasonNumber: 2 });

      expect(res.status).toBe(201);
    });

    it('surfaces the 409 of a duplicate request', async () => {
      const conflict = Object.assign(new Error('Diese Anfrage existiert bereits'), { status: 409 });
      RequestsService.create.mockRejectedValue(conflict);

      const res = await post({ scope: 'season', seasonNumber: 2 });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /search', () => {
    const searchHit = { id: 70523, media_type: 'tv', name: 'Dark' };

    beforeEach(() => {
      TmdbService.search.mockResolvedValue({ results: [searchHit] });
      RequestsService.isBanned.mockReturnValue(false);
      RequestsService.exists.mockResolvedValue(false);
      RequestsService.isWholeTitleRequested.mockResolvedValue(false);
      RequestsService.isWholeTitleRequested.mockResolvedValue(false);
      RequestsService.crossCheck.mockResolvedValue({ exists: true, jellyfinItemId: 'jf-1' });
    });

    it('is rejected without a session', async () => {
      const res = await request(createApp({ authenticated: false })).get('/search?q=dark');
      expect(res.status).toBe(401);
    });

    it('requires a query', async () => {
      const res = await request(createApp()).get('/search');

      expect(res.status).toBe(400);
      expect(TmdbService.search).not.toHaveBeenCalled();
    });

    // The library detail view needs the id to be navigable from a search hit.
    it('returns the matched Jellyfin item id alongside exists', async () => {
      const res = await request(createApp()).get('/search?q=dark');

      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({
        id: 70523,
        name: 'Dark',
        banned: false,
        requested: false,
        exists: true,
        jellyfinItemId: 'jf-1'
      });
    });

    it('reports a null item id when the cross-check found nothing', async () => {
      RequestsService.crossCheck.mockResolvedValue({ exists: false, jellyfinItemId: null });

      const res = await request(createApp()).get('/search?q=dark');

      expect(res.body[0].exists).toBe(false);
      expect(res.body[0].jellyfinItemId).toBeNull();
    });

    it('reports a null item id when the cross-check fails', async () => {
      RequestsService.crossCheck.mockRejectedValue(new Error('jellyfin down'));

      const res = await request(createApp()).get('/search?q=dark');

      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({ exists: false, jellyfinItemId: null });
    });

    // Up to 40 hits fan out here; a per-result TMDB detail fetch would be brutal.
    it('keeps the fast path: the hit is handed to the cross-check, no detail fetch', async () => {
      await request(createApp()).get('/search?q=dark');

      expect(RequestsService.crossCheck).toHaveBeenCalledWith(
        'user-1', 'token', 70523, 'tv', { media: searchHit, withSeasons: false }
      );
      expect(TmdbService.getTvDetails).not.toHaveBeenCalled();
      expect(TmdbService.getMovieDetails).not.toHaveBeenCalled();
    });
  });

  describe('GET /details', () => {
    beforeEach(() => {
      TmdbService.getTvDetails.mockResolvedValue({ id: 70523, name: 'Dark', seasons: TV_SEASONS });
      RequestsService.isBanned.mockReturnValue(false);
      RequestsService.getBannedMedia.mockReturnValue(null);
      RequestsService.exists.mockResolvedValue(false);
      RequestsService.isWholeTitleRequested.mockResolvedValue(false);
    });

    it('requires tmdbId and tmdbType', async () => {
      const res = await request(createApp()).get('/details?tmdbId=70523');
      expect(res.status).toBe(400);
    });

    // Deliberately public; this must not start requiring a session.
    it('answers without a session', async () => {
      const res = await request(createApp({ authenticated: false })).get('/details?tmdbId=70523&tmdbType=tv');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: 70523, banned: false, bannedInfo: null, requested: false });
    });

    it('does not attach any Jellyfin or season data', async () => {
      const res = await request(createApp()).get('/details?tmdbId=70523&tmdbType=tv');

      expect(res.body.jellyfinItemId).toBeUndefined();
      expect(RequestsService.crossCheck).not.toHaveBeenCalled();
      expect(TmdbService.getSeasonDetails).not.toHaveBeenCalled();
    });

    it('uses the movie lookup for a movie', async () => {
      TmdbService.getMovieDetails.mockResolvedValue({ id: 42, title: 'Inception' });

      const res = await request(createApp()).get('/details?tmdbId=42&tmdbType=movie');

      expect(res.status).toBe(200);
      expect(TmdbService.getMovieDetails).toHaveBeenCalledWith(42);
      expect(TmdbService.getTvDetails).not.toHaveBeenCalled();
    });
  });

  describe('GET /season', () => {
    beforeEach(() => {
      TmdbService.getSeasonDetails.mockResolvedValue(SEASON_TWO);
    });

    it('is rejected without a session', async () => {
      const res = await request(createApp({ authenticated: false })).get('/season?tmdbId=70523&seasonNumber=2');
      expect(res.status).toBe(401);
    });

    it('requires tmdbId and seasonNumber', async () => {
      expect((await request(createApp()).get('/season?tmdbId=70523')).status).toBe(400);
      expect((await request(createApp()).get('/season?seasonNumber=2')).status).toBe(400);
      expect((await request(createApp()).get('/season?tmdbId=70523&seasonNumber=x')).status).toBe(400);
      expect(TmdbService.getSeasonDetails).not.toHaveBeenCalled();
    });

    it('returns the season with its episodes, trimmed to the fields the UI needs', async () => {
      const res = await request(createApp()).get('/season?tmdbId=70523&seasonNumber=2');

      expect(res.status).toBe(200);
      expect(TmdbService.getSeasonDetails).toHaveBeenCalledWith(70523, 2);
      expect(res.body).toEqual({
        season_number: 2,
        name: 'Staffel 2',
        episodes: [
          { episode_number: 1, name: 'Beginnings and Endings', overview: 'o1', still_path: '/s1.jpg', air_date: '2019-06-21' },
          { episode_number: 2, name: 'Dark Matter', overview: 'o2', still_path: '/s2.jpg', air_date: '2019-06-21' }
        ]
      });
    });

    it('answers with an empty episode list when TMDB has none', async () => {
      TmdbService.getSeasonDetails.mockResolvedValue({ season_number: 3 });

      const res = await request(createApp()).get('/season?tmdbId=70523&seasonNumber=3');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ season_number: 3, name: 'Staffel 3', episodes: [] });
    });

    it('404s when TMDB knows no such season', async () => {
      TmdbService.getSeasonDetails.mockResolvedValue(null);

      const res = await request(createApp()).get('/season?tmdbId=70523&seasonNumber=9');

      expect(res.status).toBe(404);
    });

    it('is registered before GET /:id', async () => {
      await request(createApp()).get('/season?tmdbId=70523&seasonNumber=2');

      expect(RequestsService.getById).not.toHaveBeenCalled();
    });
  });

  describe('POST /cross-check', () => {
    it('is rejected without a session', async () => {
      const res = await request(createApp({ authenticated: false })).post('/cross-check').send({ tmdbId: 1, tmdbType: 'tv' });
      expect(res.status).toBe(401);
    });

    it('requires tmdbId and tmdbType', async () => {
      const res = await request(createApp()).post('/cross-check').send({ tmdbId: 1 });

      expect(res.status).toBe(400);
      expect(RequestsService.crossCheck).not.toHaveBeenCalled();
    });

    // The season pass is what the request UI needs, so this call must keep it on.
    it('returns the full cross-check including the season list', async () => {
      RequestsService.crossCheck.mockResolvedValue({
        exists: true,
        jellyfinItemId: 'jf-1',
        banned: false,
        seasons: [
          { season_number: 0, name: 'Specials', exists: false, jellyfin_season_id: null, episode_count: 2, requestable: false, reason: 'special' },
          { season_number: 1, name: 'Staffel 1', exists: true, jellyfin_season_id: 'jf-s1', episode_count: 10, requestable: false },
          { season_number: 2, name: 'Staffel 2', exists: false, jellyfin_season_id: null, episode_count: 8, requestable: true }
        ]
      });

      RequestsService.getOpenScopes.mockResolvedValue([]);

      const res = await request(createApp()).post('/cross-check').send({ tmdbId: '70523', tmdbType: 'tv' });

      expect(res.status).toBe(200);
      expect(RequestsService.crossCheck).toHaveBeenCalledWith('user-1', 'token', 70523, 'tv');
      expect(res.body.seasons).toHaveLength(3);
      expect(res.body.seasons[2]).toMatchObject({ season_number: 2, requestable: true });
    });

    // Der Client kann die Sperre nicht aus den eigenen Anfragen ableiten — die
    // Duplikatsregel gilt über alle Nutzer hinweg.
    it('reports every open scope for the title, not just the caller’s own', async () => {
      RequestsService.crossCheck.mockResolvedValue({ exists: false, jellyfinItemId: null, banned: false });
      RequestsService.getOpenScopes.mockResolvedValue([
        { request_scope: 'season', season_number: 2, episode_number: null },
        { request_scope: 'episode', season_number: 1, episode_number: 4 }
      ]);

      const res = await request(createApp()).post('/cross-check').send({ tmdbId: '70523', tmdbType: 'tv' });

      expect(res.status).toBe(200);
      expect(RequestsService.getOpenScopes).toHaveBeenCalledWith(70523, 'tv');
      expect(res.body.requestedScopes).toEqual([
        { request_scope: 'season', season_number: 2, episode_number: null },
        { request_scope: 'episode', season_number: 1, episode_number: 4 }
      ]);
    });
  });

  describe('approve / reject do not trigger a webhook', () => {
    it('POST /:id/approve never calls sendRequestCreated', async () => {
      RequestsService.approve.mockResolvedValue({ id: 1, status: 'approved' });

      const res = await request(createApp()).post('/1/approve');

      expect(res.status).toBe(200);
      expect(sendRequestCreated).not.toHaveBeenCalled();
    });

    it('POST /:id/reject never calls sendRequestCreated', async () => {
      RequestsService.reject.mockResolvedValue({ id: 1, status: 'rejected' });

      const res = await request(createApp()).post('/1/reject');

      expect(res.status).toBe(200);
      expect(sendRequestCreated).not.toHaveBeenCalled();
    });
  });
});
