import { request } from './client.js';

export const ReportsApi = {
  create: ({ itemId, scope, seasonNumber, episodeNumber, problem, message }) => request('/api/reports', {
    method: 'POST',
    body: { itemId, scope, seasonNumber, episodeNumber, problem, message }
  }),
  getMine: () => request('/api/reports'),
  getOpen: () => request('/api/reports/admin/open'),
  getAll: () => request('/api/reports/admin/all'),
  resolve: id => request(`/api/reports/${encodeURIComponent(id)}/resolve`, { method: 'POST', body: {} }),
  dismiss: id => request(`/api/reports/${encodeURIComponent(id)}/dismiss`, { method: 'POST', body: {} })
};
