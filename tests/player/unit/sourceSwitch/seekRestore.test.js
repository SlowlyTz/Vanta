import { describe, it, expect, vi, afterEach } from 'vitest';
import { waitForDurationOrSeekable } from '../../../../src/player/src/sourceSwitch/seekRestore.js';

describe('waitForDurationOrSeekable', () => {
  afterEach(() => vi.useRealTimers());

  it('reads the duration from the <video>, which vidstack\'s <media-player> does not mirror', async () => {
    vi.useFakeTimers();
    const video = { duration: 1320, seekable: { length: 0 } };
    const player = {
      querySelector: () => video,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    let resolved = false;
    waitForDurationOrSeekable(player, 3_000).then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved).toBe(true);
    expect(player.addEventListener).not.toHaveBeenCalled();
  });

  it('waits for the duration to arrive, at most until the timeout', async () => {
    vi.useFakeTimers();
    const video = { duration: NaN, seekable: { length: 0 } };
    const listeners = {};
    const player = {
      querySelector: () => video,
      addEventListener: (type, fn) => { listeners[type] = fn; },
      removeEventListener: vi.fn()
    };
    let resolved = false;
    waitForDurationOrSeekable(player, 3_000).then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(500);
    expect(resolved).toBe(false);
    video.duration = 60;
    listeners['duration-change']();
    await Promise.resolve();
    expect(resolved).toBe(true);
  });
});
