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
    crossCheck: vi.fn()
  }
}));

vi.mock('../../../src/server/services/tmdb.service.js', () => ({
  TmdbService: {
    search: vi.fn(),
    getMovieDetails: vi.fn(),
    getTvDetails: vi.fn()
  }
}));

vi.mock('../../../src/server/services/discord-webhook.service.js', () => ({
  sendRequestCreated: vi.fn()
}));

import { AuthService } from '../../../src/server/services/jellyfin/auth.service.js';
import { RequestsService } from '../../../src/server/services/requests.service.js';
import { sendRequestCreated } from '../../../src/server/services/discord-webhook.service.js';

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
