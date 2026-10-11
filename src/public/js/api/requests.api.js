import { request } from './client.js';

class RequestsApiClient {
  static async search(query, { signal } = {}) {
    return request(`/api/requests/search?q=${encodeURIComponent(query)}`, { signal });
  }

  static async getDetails(tmdbId, tmdbType, { signal } = {}) {
    return request(`/api/requests/details?tmdbId=${tmdbId}&tmdbType=${tmdbType}`, { signal });
  }

  static async crossCheck(tmdbId, tmdbType, { signal } = {}) {
    return request('/api/requests/cross-check', {
      method: 'POST',
      body: { tmdbId, tmdbType },
      signal
    });
  }

  // `scope` defaults to 'all' on the server, so a whole-title request can omit it.
  static async createRequest(tmdbId, tmdbType, note = '', { scope, seasonNumber, episodeNumber } = {}) {
    const body = { tmdbId, tmdbType, note };
    if (scope) body.scope = scope;
    if (seasonNumber !== undefined && seasonNumber !== null) body.seasonNumber = seasonNumber;
    if (episodeNumber !== undefined && episodeNumber !== null) body.episodeNumber = episodeNumber;

    return request('/api/requests', {
      method: 'POST',
      body
    });
  }

  static async getSeason(tmdbId, seasonNumber) {
    return request(`/api/requests/season?tmdbId=${encodeURIComponent(tmdbId)}&seasonNumber=${encodeURIComponent(seasonNumber)}`);
  }

  static async getMyRequests({ signal } = {}) {
    return request('/api/requests', { signal });
  }

  static async getOpenRequests() {
    return request('/api/requests/admin/open');
  }

  static async getAllRequests() {
    return request('/api/requests/admin/all');
  }

  static async approveRequest(id) {
    return request(`/api/requests/${id}/approve`, {
      method: 'POST'
    });
  }

  static async rejectRequest(id) {
    return request(`/api/requests/${id}/reject`, {
      method: 'POST'
    });
  }
}

export { RequestsApiClient as RequestsApi };
