import { request } from './client.js';

export const NotificationsApi = {
  getSummary: () => request('/api/notifications'),
  // Returns { previousSeenAt }: when the user looked at that list before.
  markSeen: kind => request('/api/notifications/seen', { method: 'POST', body: { kind } }),
  // The bell: { items, unread }.
  getFeed: () => request('/api/notifications/feed'),
  // One entry (id) or, without, all of them; answers { unread }.
  markRead: (id = null) => request('/api/notifications/read', { method: 'POST', body: { id } }),
  getPreferences: () => request('/api/notifications/preferences'),
  savePreferences: patch => request('/api/notifications/preferences', { method: 'PUT', body: patch }),
  getPushKey: () => request('/api/notifications/push-key'),
  subscribe: subscription => request('/api/notifications/subscriptions', { method: 'POST', body: { subscription } }),
  unsubscribe: endpoint => request('/api/notifications/subscriptions', { method: 'DELETE', body: { endpoint } }),
  // `retry`: the second try right after renewing the subscription.
  sendTest: ({ retry = false } = {}) => request(`/api/notifications/test${retry ? '?retry=1' : ''}`, { method: 'POST' })
};
