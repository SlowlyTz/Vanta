import { request } from './client.js';

export const MediaApi = {
  getHome() {
    return request('/api/media/home');
  },

  getHomeCategories() {
    return request('/api/media/home-categories');
  },

  getHomeSections() {
    return request('/api/media/home-sections');
  },

  search(query) {
    return request(`/api/media/search?q=${encodeURIComponent(query)}`);
  },

  getItem(id) {
    return request(`/api/media/item/${id}`);
  },

  getSimilar(id) {
    return request(`/api/media/item/${id}/similar`);
  },

  getSeasons(id) {
    return request(`/api/media/item/${id}/seasons`);
  },

  getEpisodes(id, seasonId) {
    let url = `/api/media/item/${id}/episodes`;
    if (seasonId) {
      url += `?seasonId=${seasonId}`;
    }
    return request(url);
  },

  getGenres(type) {
    return request(`/api/media/genres?type=${type}`);
  },

  getStudios() {
    return request('/api/media/studios');
  },

  getLibrary(type, genre = null, studio = null, page = 1, limit = 50) {
    let url = `/api/media/library?type=${encodeURIComponent(type)}&page=${page}&limit=${limit}`;
    if (genre) {
      url += `&genre=${encodeURIComponent(genre)}`;
    }
    if (studio) {
      url += `&studio=${encodeURIComponent(studio)}`;
    }
    return request(url);
  },

  getPerson(id) {
    return request(`/api/media/person/${id}`);
  },

  getPersonItems(id) {
    return request(`/api/media/person/${id}/items`);
  },

  getPersonByName(name) {
    return request(`/api/media/person/by-name/${encodeURIComponent(name)}`);
  },

  getPersonItemsByName(name) {
    return request(`/api/media/person/by-name/${encodeURIComponent(name)}/items`);
  },

  getImageUrl(id, type = 'Primary', width = null, options = {}) {
    let url = `/api/media/image/${id}?type=${type}`;
    const imageOptions = typeof options === 'string' ? { tag: options } : options;

    if (width) {
      url += `&maxWidth=${width}`;
    }
    if (imageOptions.tag) {
      url += `&tag=${encodeURIComponent(imageOptions.tag)}`;
    }
    if (imageOptions.maxHeight) {
      url += `&maxHeight=${encodeURIComponent(imageOptions.maxHeight)}`;
    }
    if (imageOptions.quality) {
      url += `&quality=${encodeURIComponent(imageOptions.quality)}`;
    }
    return url;
  },

  getStreamUrl(id) {
    return `/api/media/stream/${id}`;
  },

  getPlayback(id, mode = 'auto', options = {}) {
    const params = new URLSearchParams({ mode });
    if (options.qualityProfile) {
      params.set('qualityProfile', options.qualityProfile);
    }
    return request(`/api/media/playback/${id}?${params.toString()}`);
  },

  reportPlayback(event, payload, options = {}) {
    return request(`/api/media/playback/report/${encodeURIComponent(event)}`, {
      method: 'POST',
      body: payload,
      keepalive: Boolean(options.keepalive)
    });
  },

  getTrailers(cursor = null, limit = 8, refresh = false, target = null) {
    const params = new URLSearchParams();
    if (cursor !== null && cursor !== undefined) {
      params.set('cursor', String(cursor));
    }
    params.set('limit', String(limit));
    if (refresh) {
      params.set('refresh', '1');
    }
    if (target) {
      params.set('target', target);
    }
    return request(`/api/media/trailers?${params.toString()}`);
  },

  favoriteItem(id) {
    return request(`/api/media/item/${encodeURIComponent(id)}/favorite`, {
      method: 'POST'
    });
  },

  unfavoriteItem(id) {
    return request(`/api/media/item/${encodeURIComponent(id)}/favorite`, {
      method: 'DELETE'
    });
  }
};
