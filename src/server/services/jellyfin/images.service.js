import { jellyfinRawFetch } from './client.js';

export class ImagesService {
  static async fetchImageStream(itemId, token, type = 'Primary', query = {}) {
    const urlParams = new URLSearchParams();
    if (query.tag) urlParams.append('tag', query.tag);
    if (query.width) urlParams.append('width', query.width);
    if (query.height) urlParams.append('height', query.height);
    if (query.maxWidth) urlParams.append('maxWidth', query.maxWidth);
    if (query.maxHeight) urlParams.append('maxHeight', query.maxHeight);
    if (query.quality) urlParams.append('quality', query.quality);

    const queryString = urlParams.toString();
    const path = `/Items/${itemId}/Images/${type}${queryString ? '?' + queryString : ''}`;

    return jellyfinRawFetch(path, { token });
  }
}
