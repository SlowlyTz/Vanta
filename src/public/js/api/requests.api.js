import { request } from './client.js';

class RequestsApiClient {
  static async search(query) {
    return request(`/api/requests/search?q=${encodeURIComponent(query)}`);
  }

  static async getDetails(tmdbId, tmdbType) {
    return request(`/api/requests/details?tmdbId=${tmdbId}&tmdbType=${tmdbType}`);
  }

  static async crossCheck(tmdbId, tmdbType) {
    return request('/api/requests/cross-check', {
      method: 'POST',
      body: { tmdbId, tmdbType }
    });
  }

  static async createRequest(tmdbId, tmdbType, note = '') {
    return request('/api/requests', {
      method: 'POST',
      body: { tmdbId, tmdbType, note }
    });
  }

  static async getMyRequests() {
    return request('/api/requests');
  }

  static async getOpenRequests() {
    return request('/api/requests/admin/open');
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

  static async deleteRequest(id) {
    return request(`/api/requests/${id}`, {
      method: 'DELETE'
    });
  }
}

export { RequestsApiClient as RequestsApi };
