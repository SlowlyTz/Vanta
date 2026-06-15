import { request } from './client.js';

export const SeerApi = {
  search(query) {
    return request(`/api/seer/search?q=${encodeURIComponent(query)}`);
  },

  getMovieDetails(id) {
    return request(`/api/seer/movie/${id}`);
  },

  getTvDetails(id) {
    return request(`/api/seer/tv/${id}`);
  },

  createRequest(mediaType, mediaId, seasons) {
    const body = { mediaType, mediaId };
    if (mediaType === 'tv' && seasons) {
      body.seasons = seasons;
    }
    return request('/api/seer/request', {
      method: 'POST',
      body
    });
  },

  getMyRequests(filter = {}) {
    const params = new URLSearchParams();
    if (filter.take) params.set('take', filter.take);
    if (filter.skip) params.set('skip', filter.skip);
    if (filter.filter) params.set('filter', filter.filter);

    const query = params.toString();
    return request(`/api/seer/requests${query ? '?' + query : ''}`);
  },

  deleteRequest(id) {
    return request(`/api/seer/request/${id}`, {
      method: 'DELETE'
    });
  }
};