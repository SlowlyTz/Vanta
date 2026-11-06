// Admin dashboard endpoints: overview and announcements to all users.
import { request } from './client.js';

export const AdminDashboardApi = {
  get: ({ signal } = {}) => request('/api/admin/dashboard', { signal }),
  // Films and episodes held in more than one library, with their files.
  duplicates: () => request('/api/admin/dashboard/duplicates'),
  // { title, body } to every user; answers { recipients, pushed }.
  announce: message => request('/api/admin/dashboard/announce', { method: 'POST', body: message })
};
