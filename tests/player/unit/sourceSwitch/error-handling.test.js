import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSourceSwitch, DIRECT_CAN_PLAY_TIMEOUT_MS } from '../../../../src/player/src/sourceSwitch.js';
import {
  MockEventTarget,
  setupGlobals,
  restoreGlobals,
  createMockReporter,
  createMockUi,
  createMockCallbacks
} from './helpers.js';

describe('createSourceSwitch · Error Handling', () => {
  let player;
  let reporter;
  let ui;
  let callbacks;
  let sourceSwitch;

  beforeEach(() => {
    setupGlobals();
    player = new MockEventTarget();
    reporter = createMockReporter();
    ui = createMockUi();
    callbacks = createMockCallbacks();
    sourceSwitch = createSourceSwitch({ player, reporter, ui, callbacks });
  });

  afterEach(() => {
    restoreGlobals();
  });

  it('clears switching state on load error', async () => {
    const playback = { url: '/video.mp4', delivery: 'http', playSessionId: 'session-1' };
    const loadPromise = sourceSwitch.loadPlayback(playback, { isBoot: true });

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(sourceSwitch.isSwitching()).toBe(true);

    player.dispatchEvent({ type: 'error', detail: { message: 'network error' } });

    await expect(loadPromise).rejects.toThrow('network error');
    expect(sourceSwitch.isSwitching()).toBe(false);
  });

  it('clears switching state when autoplay is blocked', async () => {
    player.play = () => {
      const error = new Error('Autoplay blocked');
      error.name = 'NotAllowedError';
      return Promise.reject(error);
    };

    const playback = { url: '/video.mp4', delivery: 'http', playSessionId: 'session-1' };
    const loadPromise = sourceSwitch.loadPlayback(playback, { isBoot: true });

    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });

    await loadPromise;

    expect(sourceSwitch.isSwitching()).toBe(false);
    expect(sourceSwitch.getAutoplayBlocked()).toBe(true);
    expect(callbacks.setLoading).toHaveBeenLastCalledWith(false);
  });

  it('treats a start paused by the viewer as paused, not as an error', async () => {
    player.play = () => Promise.reject(Object.assign(new Error('The play() request was interrupted by a call to pause().'), { name: 'AbortError' }));

    const loadPromise = sourceSwitch.loadPlayback({ url: '/video.mp4', delivery: 'http', playSessionId: 'session-1' }, { isBoot: true });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });

    await loadPromise;
    expect(sourceSwitch.isSwitching()).toBe(false);
    expect(sourceSwitch.getIntendsToPlay()).toBe(false);
    expect(callbacks.showError).not.toHaveBeenCalled();
  });

  it('gives up on a direct source that never becomes playable, so the HLS fallback takes over', async () => {
    vi.useFakeTimers();
    try {
      const loadPromise = sourceSwitch.loadPlayback({ url: '/video', delivery: 'http', playMethod: 'DirectPlay', container: 'mkv' }, { isBoot: true });
      const settled = expect(loadPromise).rejects.toThrow(/timed out/);
      await vi.advanceTimersByTimeAsync(DIRECT_CAN_PLAY_TIMEOUT_MS + 10);
      await settled;
      expect(sourceSwitch.isSwitching()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('waits on an HLS source without a time limit (a transcode can take a while)', async () => {
    vi.useFakeTimers();
    try {
      let rejected = false;
      sourceSwitch.loadPlayback({ url: '/master.m3u8', delivery: 'hls' }, { isBoot: true }).catch(() => { rejected = true; });
      await vi.advanceTimersByTimeAsync(DIRECT_CAN_PLAY_TIMEOUT_MS * 3);
      expect(rejected).toBe(false);
      expect(sourceSwitch.isSwitching()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
