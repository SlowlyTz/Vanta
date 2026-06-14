import { request } from './client.js';

export const MediaApi = {
  getHome() {
    return request('/api/media/home');
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

  getPlayback(id, mode) {
    const params = new URLSearchParams();
    if (mode) {
      params.set('mode', mode);
    }

    const query = params.toString();
    return request(`/api/media/playback/${id}${query ? '?' + query : ''}`);
  }
};
