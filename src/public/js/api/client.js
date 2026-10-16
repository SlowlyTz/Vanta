import { BUILD_HEADER, reportServerBuild } from '../utils/appVersion.js';
import { endClientSession } from '../utils/sessionNotice.js';
import { PAGE_LEFT } from '../utils/pageScope.js';

// A request of a page that was left never settles: nothing is left to show
// its result, and an error would only pop up a toast for a page that is gone.
const leftBehind = (signal) => Boolean(signal?.aborted && (signal.reason === PAGE_LEFT || signal.vantaPageLeft === true));
const never = () => new Promise(() => {});

const NETWORK_ERROR_EVENT = 'vanta:network-error';

const createApiError = (message, response, options = {}) => {
  const error = new Error(message);
  error.status = response?.status;
  error.isAuthError = response?.status === 401;
  error.silent = Boolean(options.silent);
  if (options.code !== undefined) error.code = options.code;
  if (options.reason !== undefined) error.reason = options.reason;
  if (options.limit !== undefined) error.limit = options.limit;
  if (options.activeStreams !== undefined) error.activeStreams = options.activeStreams;
  if (options.retryAfterMs !== undefined) error.retryAfterMs = options.retryAfterMs;
  return error;
};

// `options.signal` (usually a page scope's) aborts the request; see above.
export async function request(url, options = {}) {
  if (leftBehind(options.signal)) return never();

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  options.headers = {
    ...defaultHeaders,
    ...options.headers,
  };

  if (options.body && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
  }

  try {
    let response;
    try {
      response = await fetch(url, options);
    } catch (networkError) {
      // fetch only rejects when the request never got a response (offline,
      // server down, aborted); the offline overlay listens for this.
      if (networkError?.name !== 'AbortError') {
        window.dispatchEvent(new CustomEvent(NETWORK_ERROR_EVENT, { detail: { url } }));
      }
      throw networkError;
    }

    // An answer the browser may keep (max-age) can come from its cache and
    // name the build of a deploy ago; only fresh answers tell the build.
    if (!/max-age=[1-9]/.test(response.headers?.get?.('cache-control') || '')) {
      reportServerBuild(response.headers?.get?.(BUILD_HEADER));
    }

    if (response.status === 401) {
      const errJson = await response.json().catch(() => ({}));
      const error = createApiError(errJson.error || 'Unauthorized', response, { silent: true, code: errJson.code, reason: errJson.reason });

      // A ban or a deleted account ends the session on the server; the login
      // page explains why.
      const explained = errJson.code === 'BANNED' || errJson.code === 'ACCOUNT_DELETED';
      endClientSession(explained ? { message: errJson.error, reason: errJson.reason } : null);

      throw error;
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw createApiError(errJson.error || `Request failed with status ${response.status}`, response, {
        code: errJson.code,
        reason: errJson.reason,
        limit: errJson.limit,
        activeStreams: errJson.activeStreams,
        retryAfterMs: errJson.retryAfterMs
      });
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    if (leftBehind(options.signal)) return never();
    if (!error.silent) {
      console.error(`[API Request Error] ${url}:`, error.message);
    }
    throw error;
  }
}
