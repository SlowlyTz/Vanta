import { request } from './client.js';

export const SessionsApi = {
  // { sessions: [{ id, userAgent, loginAt, current }] }
  list: () => request('/api/sessions'),
  end: id => request(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  endOthers: () => request('/api/sessions', { method: 'DELETE' })
};
