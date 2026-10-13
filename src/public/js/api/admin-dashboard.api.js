import { request } from './client.js';

export const AdminDashboardApi = {
  get: ({ signal } = {}) => request('/api/admin/dashboard', { signal }),
  // { title, body } to every user; answers { recipients, pushed }.
  announce: message => request('/api/admin/dashboard/announce', { method: 'POST', body: message })
};
