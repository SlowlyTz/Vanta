import { request } from './client.js';

export const PreferencesApi = {
  get: () => request('/api/preferences'),
  // Answers the complete settings after the change.
  update: patch => request('/api/preferences', { method: 'PUT', body: patch })
};
