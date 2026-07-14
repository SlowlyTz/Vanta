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

describe('createSourceSwitch · Gating', () => {
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

  it('does not auto-play when playback is gated', async () => {
    const preventSourceSwitch = createSourceSwitch({
      player,
      reporter,
      ui,
      callbacks,
      shouldPreventPlayback: () => true
    });

    const playback = { url: '/gated.mp4', delivery: 'http', playSessionId: 'session-gated' };
    const loadPromise = preventSourceSwitch.loadPlayback(playback, { isBoot: true });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });
    player.dispatchEvent({ type: 'playing' });

    await loadPromise;

    expect(player.paused).toBe(true);
  });

  it('does not call pause() for deferred non-playing loads', async () => {
    const pause = vi.fn(() => {
      throw new Error('pause should not be called for deferred loads');
    });
    player.pause = pause;

    const playback = { url: '/deferred.mp4', delivery: 'http', playSessionId: 'session-deferred' };
    const loadPromise = sourceSwitch.loadPlayback(playback, { isBoot: true, shouldPlay: false });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });

    await loadPromise;

    expect(pause).not.toHaveBeenCalled();
    expect(player.paused).toBe(true);
  });
});
