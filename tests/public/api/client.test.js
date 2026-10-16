import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request } from '../../../src/public/js/api/client.js';

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

  it('leaves the ban reason for the login page when a 401 says BANNED', async () => {
    sessionStorage.clear();
    window.location.hash = '#/home';
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({
      status: 401,
      body: { error: 'Dein Konto wurde gesperrt.', code: 'BANNED', reason: 'Spam' }
    }));

    await expect(request('/api/media/library')).rejects.toMatchObject({ status: 401, code: 'BANNED' });

    expect(window.location.hash).toBe('#/login');
    expect(JSON.parse(sessionStorage.getItem('vanta.sessionNotice'))).toEqual({ message: 'Dein Konto wurde gesperrt.', reason: 'Spam' });
    sessionStorage.clear();
  });

  it('leaves no notice for an ordinary expired session', async () => {
    sessionStorage.clear();
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ status: 401, body: { error: 'Unauthorized' } }));
    await expect(request('/api/media/library')).rejects.toMatchObject({ status: 401 });
    expect(sessionStorage.getItem('vanta.sessionNotice')).toBeNull();
  });

  it('never settles a request of a page that was left, and shows nothing for it', async () => {
    const { createPageScope } = await import('../../../src/public/js/utils/pageScope.js');
    const scope = createPageScope();
    global.fetch = vi.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }));
    const networkError = vi.fn();
    window.addEventListener('vanta:network-error', networkError);

    let settled = false;
    request('/api/media/home', { signal: scope.signal }).then(() => { settled = true; }, () => { settled = true; });
    scope.leave();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(settled).toBe(false);
    expect(networkError).not.toHaveBeenCalled();

    // Started after leaving: not even sent.
    global.fetch.mockClear();
    request('/api/media/home', { signal: scope.signal });
    expect(global.fetch).not.toHaveBeenCalled();
    window.removeEventListener('vanta:network-error', networkError);
  });

  it('takes a deleted account to the login with the reason', async () => {
    sessionStorage.clear();
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({ status: 401, body: { error: 'Dein Konto wurde gelöscht.', code: 'ACCOUNT_DELETED', reason: null } }));
    await expect(request('/api/media/home')).rejects.toMatchObject({ status: 401, code: 'ACCOUNT_DELETED' });
    expect(JSON.parse(sessionStorage.getItem('vanta.sessionNotice'))).toEqual({ message: 'Dein Konto wurde gelöscht.', reason: null });
    expect(window.location.hash).toBe('#/login');
  });

  it('also on browsers without AbortSignal.reason (Chromium 68 on TVs)', async () => {
    const { createPageScope } = await import('../../../src/public/js/utils/pageScope.js');
    const reason = Object.getOwnPropertyDescriptor(AbortSignal.prototype, 'reason');
    // As on Chromium < 98: abort(reason) keeps no reason.
    Object.defineProperty(AbortSignal.prototype, 'reason', { configurable: true, get: () => undefined });
    try {
      const scope = createPageScope();
      global.fetch = vi.fn((url, { signal }) => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      }));
      let settled = false;
      request('/api/media/home', { signal: scope.signal }).then(() => { settled = true; }, () => { settled = true; });
      scope.leave();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(scope.signal.reason).toBeUndefined();
      expect(settled).toBe(false);
    } finally {
      Object.defineProperty(AbortSignal.prototype, 'reason', reason);
    }
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

  it('reports the server build from the response header', async () => {
    const listener = vi.fn();
    window.addEventListener('vanta:server-build', listener);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: name => (name === 'X-Vanta-Build' ? 'build-b' : 'application/json') },
      json: async () => ({})
    });

    await request('/api/media/home');
    window.removeEventListener('vanta:server-build', listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({ build: 'build-b' });
  });

  it('ignores the build of an answer the browser may have kept', async () => {
    const listener = vi.fn();
    window.addEventListener('vanta:server-build', listener);
    const headers = { 'X-Vanta-Build': 'old-build', 'cache-control': 'private, max-age=300', 'content-type': 'application/json' };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: name => headers[name] ?? null }, json: async () => ({}) });

    await request('/api/media/segments/x');
    window.removeEventListener('vanta:server-build', listener);

    expect(listener).not.toHaveBeenCalled();
  });
});
