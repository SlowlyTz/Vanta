import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from './profile.service.js';

vi.mock('./client.js', () => ({
  jellyfinJson: vi.fn()
}));

import { jellyfinJson } from './client.js';

function episode(id, seriesId, seriesName, extra = {}) {
  return { Id: id, Type: 'Episode', SeriesId: seriesId, SeriesName: seriesName, SeriesPrimaryImageTag: 'tag', ...extra };
}

function movie(id, name = `Movie ${id}`) {
  return { Id: id, Type: 'Movie', Name: name };
}

function seriesRow(id, name) {
  return { Id: id, Type: 'Series', Name: name };
}

function seriesMeta(id, name) {
  return { Id: id, Type: 'Series', Name: name, ChildCount: 3 };
}

// Responds to raw item batches in call order and to bundled `Ids` metadata lookups.
function mockJellyfin({ batches, seriesMetadata = {} }) {
  let batchIndex = 0;
  jellyfinJson.mockImplementation((path, options) => {
    const query = (options && options.query) || {};
    if (query.Ids) {
      const items = query.Ids.split(',').map(id => seriesMetadata[id]).filter(Boolean);
      return Promise.resolve({ Items: items, TotalRecordCount: items.length });
    }
    const batch = batches[batchIndex] || [];
    batchIndex += 1;
    return Promise.resolve({ Items: batch, TotalRecordCount: batch.length });
  });
}

describe('ProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getContinueWatching', () => {
    it('queries Jellyfin with Filters=IsResumable', async () => {
      mockJellyfin({ batches: [[movie('1')]] });

      const result = await ProfileService.getContinueWatching('user', 'token', { page: 1, limit: 24 });

      expect(result).toEqual({ items: [movie('1')], totalItems: 1 });
      expect(jellyfinJson).toHaveBeenCalledWith('/Users/user/Items', {
        token: 'token',
        query: expect.objectContaining({
          Filters: 'IsResumable',
          IncludeItemTypes: 'Movie,Series,Episode',
          Recursive: 'true',
          SortBy: 'DatePlayed',
          SortOrder: 'Descending',
          StartIndex: 0,
          Limit: 200
        })
      });
    });
  });

  describe('getHistory', () => {
    it('queries Jellyfin with Filters=IsPlayed', async () => {
      mockJellyfin({ batches: [[]] });

      const result = await ProfileService.getHistory('user', 'token', { page: 2, limit: 10 });

      expect(result).toEqual({ items: [], totalItems: 0 });
      expect(jellyfinJson).toHaveBeenCalledWith('/Users/user/Items', {
        token: 'token',
        query: expect.objectContaining({
          Filters: 'IsPlayed',
          IncludeItemTypes: 'Movie,Series,Episode',
          StartIndex: 0,
          Limit: 200
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

  describe('grouping series episodes', () => {
    it('collapses multiple episodes of the same series into one Series entry', async () => {
      mockJellyfin({
        batches: [[
          episode('e1', 's1', 'Breaking Bad'),
          episode('e2', 's1', 'Breaking Bad')
        ]],
        seriesMetadata: { s1: seriesMeta('s1', 'Breaking Bad') }
      });

      const result = await ProfileService.getContinueWatching('user', 'token', { page: 1, limit: 24 });

      expect(result.items).toEqual([seriesMeta('s1', 'Breaking Bad')]);
      expect(result.totalItems).toBe(1);
    });

    it('keeps distinct series as separate entries', async () => {
      mockJellyfin({
        batches: [[
          episode('e1', 's1', 'Breaking Bad'),
          episode('e2', 's2', 'Better Call Saul')
        ]],
        seriesMetadata: {
          s1: seriesMeta('s1', 'Breaking Bad'),
          s2: seriesMeta('s2', 'Better Call Saul')
        }
      });

      const result = await ProfileService.getHistory('user', 'token', { page: 1, limit: 24 });

      expect(result.items.map(i => i.Id)).toEqual(['s1', 's2']);
      expect(result.totalItems).toBe(2);
    });

    it('leaves movies ungrouped and unmodified', async () => {
      mockJellyfin({
        batches: [[
          movie('m1'),
          episode('e1', 's1', 'Breaking Bad'),
          movie('m2')
        ]],
        seriesMetadata: { s1: seriesMeta('s1', 'Breaking Bad') }
      });

      const result = await ProfileService.getContinueWatching('user', 'token', { page: 1, limit: 24 });

      expect(result.items).toEqual([movie('m1'), seriesMeta('s1', 'Breaking Bad'), movie('m2')]);
    });

    it('normalizes an episode and a raw Series row of the same show to a single card', async () => {
      mockJellyfin({
        batches: [[
          episode('e1', 's1', 'Breaking Bad'),
          seriesRow('s1', 'Breaking Bad')
        ]],
        seriesMetadata: { s1: seriesMeta('s1', 'Breaking Bad') }
      });

      const result = await ProfileService.getHistory('user', 'token', { page: 1, limit: 24 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].Id).toBe('s1');
    });

    it('preserves the order of the newest raw entry per group', async () => {
      mockJellyfin({
        batches: [[
          episode('e1', 's2', 'Better Call Saul'),
          movie('m1'),
          episode('e2', 's1', 'Breaking Bad'),
          episode('e3', 's2', 'Better Call Saul')
        ]],
        seriesMetadata: {
          s1: seriesMeta('s1', 'Breaking Bad'),
          s2: seriesMeta('s2', 'Better Call Saul')
        }
      });

      const result = await ProfileService.getContinueWatching('user', 'token', { page: 1, limit: 24 });

      expect(result.items.map(i => i.Id || i.Type)).toEqual(['s2', 'm1', 's1']);
    });

    it('falls back to a minimal Series object when Jellyfin has no metadata for a SeriesId', async () => {
      mockJellyfin({
        batches: [[episode('e1', 's1', 'Breaking Bad')]],
        seriesMetadata: {}
      });

      const result = await ProfileService.getContinueWatching('user', 'token', { page: 1, limit: 24 });

      expect(result.items).toEqual([{
        Id: 's1',
        Type: 'Series',
        Name: 'Breaking Bad',
        SeriesPrimaryImageTag: 'tag',
        ImageTags: { Primary: 'tag' }
      }]);
    });

    it('does not query series metadata when only movies are present', async () => {
      mockJellyfin({ batches: [[movie('m1'), movie('m2')]] });

      await ProfileService.getHistory('user', 'token', { page: 1, limit: 24 });

      expect(jellyfinJson).toHaveBeenCalledTimes(1);
    });
  });

  describe('pagination after grouping', () => {
    it('returns at most limit unique items per page', async () => {
      mockJellyfin({
        batches: [[movie('m1'), movie('m2'), movie('m3')]]
      });

      const result = await ProfileService.getHistory('user', 'token', { page: 1, limit: 2 });

      expect(result.items).toEqual([movie('m1'), movie('m2')]);
      expect(result.totalItems).toBe(3);
    });

    it('returns the second page of grouped results without duplicates', async () => {
      mockJellyfin({
        batches: [[movie('m1'), movie('m2'), movie('m3')]]
      });

      const result = await ProfileService.getHistory('user', 'token', { page: 2, limit: 2 });

      expect(result.items).toEqual([movie('m3')]);
      expect(result.totalItems).toBe(3);
    });

    it('loads a further raw batch when a series spans the batch boundary, without duplicating it', async () => {
      const firstBatch = Array.from({ length: 200 }, (_, i) => episode(`e${i}`, 's1', 'Breaking Bad'));
      const secondBatch = [episode('e200', 's1', 'Breaking Bad'), movie('m1')];

      mockJellyfin({
        batches: [firstBatch, secondBatch],
        seriesMetadata: { s1: seriesMeta('s1', 'Breaking Bad') }
      });

      const result = await ProfileService.getContinueWatching('user', 'token', { page: 1, limit: 24 });

      expect(result.items).toEqual([seriesMeta('s1', 'Breaking Bad'), movie('m1')]);
      expect(result.totalItems).toBe(2);

      const rawCalls = jellyfinJson.mock.calls.filter(([, options]) => !(options.query && options.query.Ids));
      expect(rawCalls).toHaveLength(2);
      expect(rawCalls[1][1].query).toEqual(expect.objectContaining({ StartIndex: 200, Limit: 200 }));
    });
  });
});
