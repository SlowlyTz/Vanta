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

// How long a Jellyfin call may take in total (answer and body) before it is
// given up; without a limit a hanging Jellyfin hung every route waiting on it.
// Callers that need longer (the catalogue sync) pass their own `timeoutMs`,
// 0 switches the limit off.
export const JELLYFIN_TIMEOUT_MS = 15 * 1000;

const withTimeout = (signal, timeoutMs) => {
  if (!timeoutMs) return signal;
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
};

// A timeout reads as 504 to the routes, so it is told apart from a refusal.
const asTimeoutError = (error, method, path) => {
  if (error?.name !== 'TimeoutError') return error;
  const timeoutError = new Error(`${method} ${path} timed out`);
  timeoutError.status = 504;
  timeoutError.cause = error;
  return timeoutError;
};

export async function jellyfinRawFetch(path, {
  token,
  deviceId,
  method = 'GET',
  body = null,
  headers = {},
  query = {},
  signal = null,
  timeoutMs = JELLYFIN_TIMEOUT_MS
} = {}) {
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
  const effectiveSignal = withTimeout(signal, timeoutMs);
  if (effectiveSignal) fetchOptions.signal = effectiveSignal;

  if (body !== null) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (typeof body !== 'string') {
      fetchOptions.headers['Content-Type'] = 'application/json';
    }
  }

  try {
    return await fetch(url, fetchOptions);
  } catch (error) {
    throw asTimeoutError(error, method, path);
  }
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
  try {
    return await response.json();
  } catch (error) {
    throw asTimeoutError(error, options.method || 'GET', path);
  }
}
