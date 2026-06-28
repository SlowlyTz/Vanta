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
