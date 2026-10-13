import { request } from './client.js';

export const MediaApi = {
  // Read calls take `{ signal }` (a page scope's) as their last argument.
  getHome({ signal } = {}) {
    return request('/api/media/home', { signal });
  },

  getHomeSectionGroup(group, { signal } = {}) {
    return request(`/api/media/home-sections/${encodeURIComponent(group)}`, { signal });
  },

  search(query, { signal } = {}) {
    return request(`/api/media/search?q=${encodeURIComponent(query)}`, { signal });
  },

  // The search page: { items, people }, typo-tolerant, with filters
  // ({ type, genre: [], decade, fsk, unwatched }).
  searchFull(query, filters = {}, { signal } = {}) {
    const params = new URLSearchParams({ q: query });
    if (filters.type) params.set('type', filters.type);
    if (filters.genre?.length) params.set('genre', filters.genre.join(','));
    if (filters.decade) params.set('decade', String(filters.decade));
    if (filters.fsk !== null && filters.fsk !== undefined && filters.fsk !== '') params.set('fsk', String(filters.fsk));
    if (filters.unwatched) params.set('unwatched', '1');
    return request(`/api/media/search/full?${params}`, { signal });
  },

  getItem(id, { signal } = {}) {
    return request(`/api/media/item/${id}`, { signal });
  },

  getSimilar(id, { signal } = {}) {
    return request(`/api/media/item/${id}/similar`, { signal });
  },

  getSeasons(id, { signal } = {}) {
    return request(`/api/media/item/${id}/seasons`, { signal });
  },

  getEpisodes(id, seasonId, { signal } = {}) {
    let url = `/api/media/item/${id}/episodes`;
    if (seasonId) {
      url += `?seasonId=${seasonId}`;
    }
    return request(url, { signal });
  },

  getGenres(type) {
    return request(`/api/media/genres?type=${type}`);
  },

  getStudios({ signal } = {}) {
    return request('/api/media/studios', { signal });
  },

  getLibrary(type, genre = null, studio = null, page = 1, limit = 50, options = {}) {
    let url = `/api/media/library?type=${encodeURIComponent(type)}&page=${page}&limit=${limit}`;
    if (genre) {
      url += `&genre=${encodeURIComponent(genre)}`;
    }
    if (studio) {
      url += `&studio=${encodeURIComponent(studio)}`;
    }
    if (options.publisherId) {
      url += `&publisher=${encodeURIComponent(options.publisherId)}`;
    }
    return request(url, { signal: options.signal });
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

  getPlayback(id, mode = 'auto', options = {}) {
    const params = new URLSearchParams({ mode });
    if (options.qualityProfile) {
      params.set('qualityProfile', options.qualityProfile);
    }
    if (Number.isInteger(options.audioStreamIndex)) {
      params.set('audioStreamIndex', String(options.audioStreamIndex));
    } else if (options.audioLanguage) {
      params.set('audioLanguage', options.audioLanguage);
    }
    if (options.mediaSourceId) {
      params.set('mediaSourceId', options.mediaSourceId);
    }
    if (options.replacesPlaySessionId) {
      params.set('replacesPlaySessionId', options.replacesPlaySessionId);
    }
    return request(`/api/media/playback/${id}?${params.toString()}`);
  },

  getTranscodeProgress(id) {
    return request(`/api/media/playback/${encodeURIComponent(id)}/transcode-progress`);
  },

  getSegments(id) {
    return request(`/api/media/segments/${encodeURIComponent(id)}`);
  },

  reportPlayback(event, payload, options = {}) {
    return request(`/api/media/playback/report/${encodeURIComponent(event)}`, {
      method: 'POST',
      body: payload,
      keepalive: Boolean(options.keepalive)
    });
  },

  getTrailers({ feedId = null, cursor = null, limit = 8, target = null } = {}) {
    const params = new URLSearchParams();
    // Omitting feedId is how the client asks for a brand new random feed.
    if (feedId) {
      params.set('feedId', feedId);
    }
    if (cursor !== null && cursor !== undefined) {
      params.set('cursor', String(cursor));
    }
    params.set('limit', String(limit));
    if (target) {
      params.set('target', target);
    }
    return request(`/api/media/trailers?${params.toString()}`);
  },

  getProfileContinueWatching(page = 1, limit = 24, { signal } = {}) {
    return request(`/api/media/profile/continue-watching?page=${page}&limit=${limit}`, { signal });
  },

  getProfileHistory(page = 1, limit = 24, { signal } = {}) {
    return request(`/api/media/profile/history?page=${page}&limit=${limit}`, { signal });
  },

  getProfileFavorites(page = 1, limit = 24, { signal } = {}) {
    return request(`/api/media/profile/favorites?page=${page}&limit=${limit}`, { signal });
  },

  // What one has watched: counts, time, favourite genres, the last title.
  getProfileStats({ signal } = {}) {
    return request('/api/media/profile/stats', { signal });
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
  },

  markPlayed(id) {
    return request(`/api/media/item/${encodeURIComponent(id)}/played`, {
      method: 'POST'
    });
  },

  markUnplayed(id) {
    return request(`/api/media/item/${encodeURIComponent(id)}/played`, {
      method: 'DELETE'
    });
  },

  // The started or next episode of a series: { episode } (null when none).
  getNextUp(seriesId) {
    return request(`/api/media/item/${encodeURIComponent(seriesId)}/next-up`);
  },

  // Takes a title out of "Weiter schauen"; answers { undo } for restoreResume.
  removeFromResume(id) {
    return request(`/api/media/resume/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  restoreResume(undo) {
    return request('/api/media/resume/restore', { method: 'POST', body: { undo } });
  },

  // { id: { played, progress, next, seriesProgress } } for the cards on screen.
  getUserData(ids) {
    return request(`/api/media/userdata?ids=${ids.map(encodeURIComponent).join(',')}`);
  },

  getDecades() {
    return request('/api/media/search/decades');
  },

  getScreensaverItems(limit = 30) {
    return request(`/api/media/screensaver?limit=${limit}`);
  },

  refreshUserData() {
    return request('/api/media/userdata/refresh', { method: 'POST' });
  }
};
