import crypto from 'crypto';
import env from '../../config/env.js';

export const JELLYFIN_BASE_URL = env.JELLYFIN_BASE_URL;

// Each login gets a device id of its own, so Jellyfin keeps one session per
// browser (its transcoding progress is reported per device). Sessions from
// before that keep the shared id.
export const SHARED_DEVICE_ID = 'vanta-web-client-id';
const deviceIdsByToken = new Map();

export function createDeviceId() {
  return `vanta-${crypto.randomUUID()}`;
}

export function registerTokenDevice(token, deviceId) {
  if (token && deviceId) deviceIdsByToken.set(token, deviceId);
}

export function forgetTokenDevice(token) {
  deviceIdsByToken.delete(token);
}

export function deviceIdForToken(token) {
  return (token && deviceIdsByToken.get(token)) || SHARED_DEVICE_ID;
}

export function getAuthHeader(token = null, deviceId = deviceIdForToken(token)) {
  let header = `MediaBrowser Client="VANTA", Device="Web Browser", DeviceId="${deviceId}", Version="1.0.0"`;
  if (token) {
    header += `, Token="${token}"`;
  }
  return header;
}

export async function jellyfinRawFetch(path, { token, deviceId, method = 'GET', body = null, headers = {}, query = {} } = {}) {
  const url = new URL(path, JELLYFIN_BASE_URL);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const fetchOptions = {
    method,
    headers: {
      'X-Emby-Authorization': getAuthHeader(token, deviceId || deviceIdForToken(token)),
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
