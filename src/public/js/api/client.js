const AUTH_UNAUTHORIZED_EVENT = 'vanta:auth-unauthorized';

const createApiError = (message, response, options = {}) => {
  const error = new Error(message);
  error.status = response?.status;
  error.isAuthError = response?.status === 401;
  error.silent = Boolean(options.silent);
  if (options.code !== undefined) error.code = options.code;
  if (options.reason !== undefined) error.reason = options.reason;
  if (options.limit !== undefined) error.limit = options.limit;
  if (options.activeStreams !== undefined) error.activeStreams = options.activeStreams;
  return error;
};

export async function request(url, options = {}) {
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
    const response = await fetch(url, options);

    if (response.status === 401) {
      const errJson = await response.json().catch(() => ({}));
      const error = createApiError(errJson.error || 'Unauthorized', response, { silent: true });

      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));

      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }

      throw error;
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw createApiError(errJson.error || `Request failed with status ${response.status}`, response, {
        code: errJson.code,
        reason: errJson.reason,
        limit: errJson.limit,
        activeStreams: errJson.activeStreams
      });
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    if (!error.silent) {
      console.error(`[API Request Error] ${url}:`, error.message);
    }
    throw error;
  }
}
