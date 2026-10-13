import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../../../src/server/config/env.js', () => ({
  default: { JELLYFIN_BASE_URL: 'http://jellyfin.test', JELLYFIN_API_KEY: 'k' }
}));

import { jellyfinJson, jellyfinRawFetch } from '../../../../src/server/services/jellyfin/client.js';
import { PlaybackApiService } from '../../../../src/server/services/jellyfin/playback-api.service.js';

// A fetch that only ever settles by being aborted, like a hanging Jellyfin.
const hangingFetch = () => vi.fn((url, { signal } = {}) => new Promise((resolve, reject) => {
  signal?.addEventListener('abort', () => reject(signal.reason));
}));

describe('Jellyfin timeouts', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('gives up a hanging API call with a 504', async () => {
    global.fetch = hangingFetch();
    await expect(jellyfinJson('/Users/u1', { token: 't', timeoutMs: 20 })).rejects.toMatchObject({ status: 504 });
  });

  it('still lets a caller abort, and can be switched off', async () => {
    global.fetch = hangingFetch();
    const controller = new AbortController();
    const pending = jellyfinRawFetch('/x', { signal: controller.signal, timeoutMs: 0 });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(global.fetch.mock.calls[0][1].signal).toBe(controller.signal);
  });

  it('limits only the wait for a playback answer, not the stream after it', async () => {
    vi.useFakeTimers();
    try {
      global.fetch = hangingFetch();
      const waiting = PlaybackApiService.fetchPlaybackResource('/Videos/1/stream', 't', null, { headerTimeoutMs: 1000 });
      const assertion = expect(waiting).rejects.toMatchObject({ status: 504 });
      await vi.advanceTimersByTimeAsync(1000);
      await assertion;

      let usedSignal;
      global.fetch = vi.fn(async (url, { signal }) => { usedSignal = signal; return { ok: true }; });
      await PlaybackApiService.fetchPlaybackResource('/Videos/1/stream', 't', null, { headerTimeoutMs: 1000 });
      await vi.advanceTimersByTimeAsync(10_000);
      expect(usedSignal.aborted).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('passes a client disconnect on to the playback request', async () => {
    global.fetch = hangingFetch();
    const controller = new AbortController();
    const pending = PlaybackApiService.fetchPlaybackResource('/Videos/1/stream', 't', null, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toBeTruthy();
    expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
