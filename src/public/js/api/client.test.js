import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request } from './client.js';

function mockFetchResponse({ status, body, contentType = 'application/json' }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}

describe('request()', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.location.hash = '#/profile';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('does not redirect to login or set isAuthError on a 403 response', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({
      status: 403,
      body: { error: 'Login fehlgeschlagen: Dein Benutzerkonto ist gesperrt.', reason: 'Account geteilt' }
    }));

    await expect(request('/api/auth/login', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 403,
      isAuthError: false,
      reason: 'Account geteilt'
    });

    expect(window.location.hash).toBe('#/profile');
  });

  it('redirects to login and marks isAuthError on a 401 response', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ status: 401, body: { error: 'Unauthorized' } }));

    await expect(request('/api/media/library')).rejects.toMatchObject({ status: 401, isAuthError: true });

    expect(window.location.hash).toBe('#/login');
  });

  it('passes through code, limit and activeStreams for a 429 stream-limit error', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({
      status: 429,
      body: { error: 'Stream-Limit erreicht', code: 'STREAM_LIMIT_REACHED', limit: 1, activeStreams: 1 }
    }));

    await expect(request('/api/media/playback/item-1')).rejects.toMatchObject({
      status: 429,
      code: 'STREAM_LIMIT_REACHED',
      limit: 1,
      activeStreams: 1
    });
  });
});
