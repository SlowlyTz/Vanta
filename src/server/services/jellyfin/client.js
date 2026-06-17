import env from '../../config/env.js';

export const JELLYFIN_BASE_URL = env.JELLYFIN_BASE_URL;

export function getAuthHeader(token = null) {
  let header = 'MediaBrowser Client="VANTA", Device="Web Browser", DeviceId="vanta-web-client-id", Version="1.0.0"';
  if (token) {
    header += `, Token="${token}"`;
  }
  return header;
}

export async function jellyfinRawFetch(path, { token, method = 'GET', body = null, headers = {}, query = {} } = {}) {
  const url = new URL(path, JELLYFIN_BASE_URL);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const fetchOptions = {
    method,
    headers: {
      'X-Emby-Authorization': getAuthHeader(token),
      ...headers
    }
  };

  if (body !== null) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (typeof body !== 'string') {
      fetchOptions.headers['Content-Type'] = 'application/json';
    }
  }

  return fetch(url, fetchOptions);
}

export async function jellyfinFetch(path, options = {}) {
  const response = await jellyfinRawFetch(path, options);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const error = new Error(`${options.method || 'GET'} ${path} failed: ${response.statusText || errorText}`);
    error.status = response.status;
    throw error;
  }

  return response;
}

export async function jellyfinJson(path, options = {}) {
  const response = await jellyfinFetch(path, options);
  return response.json();
}
