import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from './profile.service.js';

vi.mock('./client.js', () => ({
  jellyfinJson: vi.fn()
}));

import { jellyfinJson } from './client.js';

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContinueWatching', () => {
    it('queries Jellyfin with Filters=IsResumable', async () => {
      jellyfinJson.mockResolvedValue({ Items: [{ Id: '1' }], TotalRecordCount: 1 });

      const result = await ProfileService.getContinueWatching('user', 'token', { page: 1, limit: 24 });

      expect(result).toEqual({ items: [{ Id: '1' }], totalItems: 1 });
      expect(jellyfinJson).toHaveBeenCalledWith('/Users/user/Items', {
        token: 'token',
        query: expect.objectContaining({
          Filters: 'IsResumable',
          IncludeItemTypes: 'Movie,Series,Episode',
          Recursive: 'true',
          SortBy: 'DatePlayed',
          SortOrder: 'Descending',
          StartIndex: 0,
          Limit: 24
        })
      });
    });
  });

  describe('getHistory', () => {
    it('queries Jellyfin with Filters=IsPlayed', async () => {
      jellyfinJson.mockResolvedValue({ Items: [], TotalRecordCount: 0 });

      const result = await ProfileService.getHistory('user', 'token', { page: 2, limit: 10 });

      expect(result).toEqual({ items: [], totalItems: 0 });
      expect(jellyfinJson).toHaveBeenCalledWith('/Users/user/Items', {
        token: 'token',
        query: expect.objectContaining({
          Filters: 'IsPlayed',
          IncludeItemTypes: 'Movie,Series,Episode',
          StartIndex: 10,
          Limit: 10
        })
      });
    });
  });

  describe('getFavorites', () => {
    it('queries Jellyfin with Filters=IsFavorite and limits to Movie,Series', async () => {
      jellyfinJson.mockResolvedValue({ Items: [], TotalRecordCount: 0 });

      await ProfileService.getFavorites('user', 'token', { page: 1, limit: 24 });

      expect(jellyfinJson).toHaveBeenCalledWith('/Users/user/Items', {
        token: 'token',
        query: expect.objectContaining({
          Filters: 'IsFavorite',
          IncludeItemTypes: 'Movie,Series',
          SortBy: 'SortName',
          SortOrder: 'Ascending'
        })
      });
    });

    it('returns an empty result set as a valid response, not an error', async () => {
      jellyfinJson.mockResolvedValue({ Items: [], TotalRecordCount: 0 });

      const result = await ProfileService.getFavorites('user', 'token', {});

      expect(result).toEqual({ items: [], totalItems: 0 });
    });
  });

  describe('pagination', () => {
    it('computes StartIndex from page and limit', async () => {
      jellyfinJson.mockResolvedValue({ Items: [], TotalRecordCount: 0 });

      await ProfileService.getContinueWatching('user', 'token', { page: 3, limit: 20 });

      expect(jellyfinJson).toHaveBeenCalledWith('/Users/user/Items', {
        token: 'token',
        query: expect.objectContaining({ StartIndex: 40, Limit: 20 })
      });
    });
  });
});
