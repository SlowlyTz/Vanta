import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSourceSwitch } from '../../../../src/player/src/sourceSwitch.js';
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
});
