import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSourceSwitch } from '../../../../src/player/src/sourceSwitch.js';
import {
  MockEventTarget,
  setupGlobals,
  restoreGlobals,
  createMockReporter,
  createMockUi,
  createMockCallbacks
} from './helpers.js';

describe('createSourceSwitch · Loading Overlay', () => {
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

  it('keeps the loading overlay visible during remote start until the first frame is presented', async () => {
    let frameCallback = null;
    player.querySelector = () => ({
      requestVideoFrameCallback(callback) {
        frameCallback = callback;
        return 1;
      },
      cancelVideoFrameCallback() {}
    });

    const playback = { url: '/remote-start.mp4', delivery: 'http', playSessionId: 'session-remote' };
    const loadPromise = sourceSwitch.loadPlayback(playback, { isBoot: true, shouldPlay: false });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });
    await loadPromise;
    callbacks.setLoading.mockClear();

    const startPromise = sourceSwitch.startCurrentPlayback();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(callbacks.setLoading).toHaveBeenCalledWith(true, 'Wiedergabe wird gestartet …');
    expect(callbacks.setLoading).not.toHaveBeenCalledWith(false);

    frameCallback?.();
    await startPromise;

    expect(callbacks.setLoading).toHaveBeenLastCalledWith(false);
  });

  it('starts the inner video element when remote playback resumes from a prepared source', async () => {
    let frameCallback = null;
    const video = {
      paused: true,
      play: vi.fn(() => {
        video.paused = false;
        return Promise.resolve();
      }),
      requestVideoFrameCallback(callback) {
        frameCallback = callback;
        return 1;
      },
      cancelVideoFrameCallback() {}
    };
    player.querySelector = () => video;

    const playback = { url: '/remote-video.mp4', delivery: 'http', playSessionId: 'session-video' };
    const loadPromise = sourceSwitch.loadPlayback(playback, { isBoot: true, shouldPlay: false });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });
    await loadPromise;

    const startPromise = sourceSwitch.startCurrentPlayback();
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(video.play).toHaveBeenCalled();

    frameCallback?.();
    await startPromise;
  });

  it('keeps switching active until the first frame is presented', async () => {
    let frameCallback = null;
    player.querySelector = () => ({
      requestVideoFrameCallback(callback) {
        frameCallback = callback;
        return 1;
      },
      cancelVideoFrameCallback() {}
    });

    const playback = { url: '/video.mp4', delivery: 'http', playSessionId: 'session-1' };
    const loadPromise = sourceSwitch.loadPlayback(playback, { isBoot: true });

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(sourceSwitch.isSwitching()).toBe(true);

    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(sourceSwitch.isSwitching()).toBe(true);

    player.dispatchEvent({ type: 'seeked' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(sourceSwitch.isSwitching()).toBe(true);

    frameCallback?.();
    await loadPromise;

    expect(sourceSwitch.isSwitching()).toBe(false);
  });
});
