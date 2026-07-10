import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from './media.api.js';

function createJsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body)
  });
}

describe('MediaApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    fetch.mockReset();
  });

  describe('getTrailers', () => {
    it('requests trailers with default parameters', async () => {
      fetch.mockReturnValue(createJsonResponse({ items: [], hasMore: true }));

      await MediaApi.getTrailers();

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/trailers?limit=8');
      expect(options.method).toBeUndefined();
    });

    it('includes cursor, limit and refresh flag', async () => {
      fetch.mockReturnValue(createJsonResponse({ items: [], hasMore: false }));

      await MediaApi.getTrailers('10', 12, true);

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/trailers?cursor=10&limit=12&refresh=1');
    });

    it('includes target trailer id', async () => {
      fetch.mockReturnValue(createJsonResponse({ items: [], hasMore: false }));

      await MediaApi.getTrailers(null, 8, false, 'item-1:youtube-id');

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/trailers?limit=8&target=item-1%3Ayoutube-id');
    });

    it('returns parsed response', async () => {
      const body = { items: [{ id: 't1' }], nextCursor: '1', hasMore: true };
      fetch.mockReturnValue(createJsonResponse(body));

      const result = await MediaApi.getTrailers(null, 4);

      expect(result).toEqual(body);
    });
  });

  describe('getLibrary', () => {
    it('requests the base library url without optional filters', async () => {
      fetch.mockReturnValue(createJsonResponse({ items: [] }));

      await MediaApi.getLibrary('Movie', null, null, 1, 50);

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/library?type=Movie&page=1&limit=50');
    });

    it('encodes and appends the studio filter', async () => {
      fetch.mockReturnValue(createJsonResponse({ items: [] }));

      await MediaApi.getLibrary('Movie', null, 'Warner Bros. Pictures', 1, 50);

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/library?type=Movie&page=1&limit=50&studio=Warner%20Bros.%20Pictures');
    });

    it('appends the publisher filter when options.publisherId is set', async () => {
      fetch.mockReturnValue(createJsonResponse({ items: [] }));

      await MediaApi.getLibrary('Movie,Series', null, null, 1, 50, { publisherId: 'warner-bros' });

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/library?type=Movie%2CSeries&page=1&limit=50&publisher=warner-bros');
    });

    it('does not append a publisher filter when options is omitted', async () => {
      fetch.mockReturnValue(createJsonResponse({ items: [] }));

      await MediaApi.getLibrary('Movie', 'Action', null, 2, 20);

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/library?type=Movie&page=2&limit=20&genre=Action');
    });
  });

  describe('getProfileContinueWatching', () => {
    it('requests continue watching with default pagination', async () => {
      fetch.mockReturnValue(createJsonResponse({ items: [], page: 1, limit: 24, totalItems: 0, totalPages: 0 }));

      await MediaApi.getProfileContinueWatching();

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/profile/continue-watching?page=1&limit=24');
    });

    it('forwards explicit page and limit', async () => {
      fetch.mockReturnValue(createJsonResponse({ items: [] }));

      await MediaApi.getProfileContinueWatching(2, 10);

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/profile/continue-watching?page=2&limit=10');
    });
  });

  describe('getProfileHistory', () => {
    it('requests the history endpoint', async () => {
      fetch.mockReturnValue(createJsonResponse({ items: [] }));

      await MediaApi.getProfileHistory();

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/profile/history?page=1&limit=24');
    });
  });

  describe('getProfileFavorites', () => {
    it('requests the favorites endpoint', async () => {
      fetch.mockReturnValue(createJsonResponse({ items: [] }));

      await MediaApi.getProfileFavorites();

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/profile/favorites?page=1&limit=24');
    });
  });

  describe('favoriteItem', () => {
    it('posts to favorite endpoint', async () => {
      fetch.mockReturnValue(createJsonResponse({ isFavorite: true }));

      const result = await MediaApi.favoriteItem('item-1');

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/item/item-1/favorite');
      expect(options.method).toBe('POST');
      expect(result).toEqual({ isFavorite: true });
    });

    it('encodes item id', async () => {
      fetch.mockReturnValue(createJsonResponse({ isFavorite: true }));

      await MediaApi.favoriteItem('item with spaces');

      const [url] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/item/item%20with%20spaces/favorite');
    });
  });

  describe('unfavoriteItem', () => {
    it('deletes favorite endpoint', async () => {
      fetch.mockReturnValue(createJsonResponse({ isFavorite: false }));

      const result = await MediaApi.unfavoriteItem('item-1');

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe('/api/media/item/item-1/favorite');
      expect(options.method).toBe('DELETE');
      expect(result).toEqual({ isFavorite: false });
    });
  });
});
