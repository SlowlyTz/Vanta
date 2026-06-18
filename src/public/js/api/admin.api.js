import { request } from './client.js';

export const AdminApi = {
  getTranscoding() {
    return request('/api/admin/transcoding');
  },

  updateTranscoding(forceHlsTranscoding) {
    return request('/api/admin/transcoding', {
      method: 'PUT',
      body: { forceHlsTranscoding }
    });
  }
};
