import { request } from './client.js';

export const AdminSettingsApi = {
  getDiscordWebhook() {
    return request('/api/admin/settings/discord-webhook');
  },

  updateDiscordWebhook({ url, enabled } = {}) {
    const body = {};
    if (url !== undefined) body.url = url;
    if (enabled !== undefined) body.enabled = enabled;

    return request('/api/admin/settings/discord-webhook', {
      method: 'PUT',
      body
    });
  },

  removeDiscordWebhook() {
    return request('/api/admin/settings/discord-webhook', {
      method: 'DELETE'
    });
  },

  testDiscordWebhook(url = undefined) {
    const body = {};
    if (url) body.url = url;

    return request('/api/admin/settings/discord-webhook/test', {
      method: 'POST',
      body
    });
  }
};
