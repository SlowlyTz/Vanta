import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import profileRoutes from './profile.routes.js';

vi.mock('../../services/jellyfin/profile.service.js', () => ({
  ProfileService: {
    getContinueWatching: vi.fn(),
    getHistory: vi.fn(),
    getFavorites: vi.fn()
  }
}));

import { ProfileService } from '../../services/jellyfin/profile.service.js';

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
  app.use('/', profileRoutes);
  return app;
}

describe('Profile Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /continue-watching', () => {
    it('returns continue watching items with pagination metadata', async () => {
      ProfileService.getContinueWatching.mockResolvedValue({ items: [{ Id: '1' }], totalItems: 1 });

      const res = await request(createApp()).get('/continue-watching');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [{ Id: '1' }], page: 1, limit: 24, totalItems: 1, totalPages: 1 });
      expect(ProfileService.getContinueWatching).toHaveBeenCalledWith('test-user', 'test-token', { page: 1, limit: 24 });
    });
  });

  describe('GET /history', () => {
    it('returns history items', async () => {
      ProfileService.getHistory.mockResolvedValue({ items: [], totalItems: 0 });

      const res = await request(createApp()).get('/history?page=2&limit=10');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [], page: 2, limit: 10, totalItems: 0, totalPages: 0 });
      expect(ProfileService.getHistory).toHaveBeenCalledWith('test-user', 'test-token', { page: 2, limit: 10 });
    });

    it('passes through grouped Series cards with correct pagination metadata', async () => {
      const seriesCard = { Id: 's1', Type: 'Series', Name: 'Breaking Bad' };
      ProfileService.getHistory.mockResolvedValue({ items: [seriesCard], totalItems: 5 });

      const res = await request(createApp()).get('/history?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ items: [seriesCard], page: 1, limit: 2, totalItems: 5, totalPages: 3 });
    });

    it('treats an empty Jellyfin result as a valid response', async () => {
      ProfileService.getHistory.mockResolvedValue({ items: [], totalItems: 0 });

      const res = await request(createApp()).get('/history');

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
    });
  });

  describe('GET /favorites', () => {
    it('returns favorite items', async () => {
      ProfileService.getFavorites.mockResolvedValue({ items: [{ Id: '5' }], totalItems: 1 });

      const res = await request(createApp()).get('/favorites');

      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([{ Id: '5' }]);
      expect(ProfileService.getFavorites).toHaveBeenCalledWith('test-user', 'test-token', { page: 1, limit: 24 });
    });
  });

  describe('pagination validation', () => {
    it('clamps page to a minimum of 1 and limit to between 1 and 100', async () => {
      ProfileService.getFavorites.mockResolvedValue({ items: [], totalItems: 0 });

      await request(createApp()).get('/favorites?page=0&limit=1000');

      expect(ProfileService.getFavorites).toHaveBeenCalledWith('test-user', 'test-token', { page: 1, limit: 100 });
    });

    it('falls back to defaults for non-numeric pagination params', async () => {
      ProfileService.getFavorites.mockResolvedValue({ items: [], totalItems: 0 });

      await request(createApp()).get('/favorites?page=abc&limit=xyz');

      expect(ProfileService.getFavorites).toHaveBeenCalledWith('test-user', 'test-token', { page: 1, limit: 24 });
    });
  });

  describe('unauthorized upstream errors', () => {
    it('destroys the session when Jellyfin returns 401', async () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      ProfileService.getContinueWatching.mockRejectedValue(error);

      const res = await request(createApp()).get('/continue-watching');

      expect(res.status).toBe(401);
    });
  });
});
