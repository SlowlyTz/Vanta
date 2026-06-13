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
      // Redirect to login if user session is invalid or expired
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || 'Unauthorized');
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Request failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    console.error(`[API Request Error] ${url}:`, error.message);
    throw error;
  }
}
