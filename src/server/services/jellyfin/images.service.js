// Fetches item images from Jellyfin as raw responses for streaming on.
import { jellyfinRawFetch } from './client.js';

export class ImagesService {
  static async fetchImageStream(itemId, token, type = 'Primary', query = {}) {
    const { tag, width, height, maxWidth, maxHeight, quality } = query;
    // Empty values are left out (the client drops null and undefined).
    const params = Object.fromEntries(Object.entries({ tag, width, height, maxWidth, maxHeight, quality }).map(([key, value]) => [key, value || null]));
    // Originals can be large; the body is read within this time as well.
    return jellyfinRawFetch(`/Items/${encodeURIComponent(itemId)}/Images/${encodeURIComponent(type)}`, { token, query: params, timeoutMs: 30 * 1000 });
  }
}
