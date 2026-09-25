import { request } from './client.js';

export const NotificationsApi = {
  getSummary: () => request('/api/notifications'),
  // Returns { previousSeenAt }: when the user looked at that list before.
  markSeen: kind => request('/api/notifications/seen', { method: 'POST', body: { kind } })
};
