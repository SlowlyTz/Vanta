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

describe('createSourceSwitch · Rollback', () => {
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

  it('rolls back to previous playback on switch failure', async () => {
    const initialPlayback = {
      url: '/initial.mp4',
      delivery: 'http',
      playSessionId: 'session-1'
    };
    const failingPlayback = {
      url: '/failing.mp4',
      delivery: 'http',
      playSessionId: 'session-2'
    };

    // Load initial playback successfully
    const initialLoad = sourceSwitch.loadPlayback(initialPlayback, { isBoot: true });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });
    player.dispatchEvent({ type: 'playing' });
    await initialLoad;

    // Attempt switch to failing playback
    const switchPromise = sourceSwitch.switchTo(failingPlayback, {
      position: 30,
      shouldPlay: true,
      label: 'Switching …'
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'error', detail: { message: 'network error' } });

    // Rollback load starts; resolve it so timers clean up
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });
    player.dispatchEvent({ type: 'playing' });

    const result = await switchPromise;

    expect(result.success).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(sourceSwitch.getCurrentPlayback()).toBe(initialPlayback);
  });

  it('does not roll back when noRollback option is set', async () => {
    const initialPlayback = { url: '/initial.mp4', delivery: 'http' };
    const failingPlayback = { url: '/failing.mp4', delivery: 'http' };

    const initialLoad = sourceSwitch.loadPlayback(initialPlayback, { isBoot: true });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });
    player.dispatchEvent({ type: 'playing' });
    await initialLoad;

    const switchPromise = sourceSwitch.switchTo(failingPlayback, {
      position: 30,
      shouldPlay: true,
      label: 'Switching …',
      noRollback: true
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'error', detail: { message: 'network error' } });

    await expect(switchPromise).rejects.toThrow('network error');
    expect(sourceSwitch.getCurrentPlayback()).toBe(failingPlayback);
  });

  it('reports before source switch', async () => {
    const initialPlayback = { url: '/initial.mp4', delivery: 'http', playSessionId: 'session-1' };
    const nextPlayback = { url: '/next.mp4', delivery: 'http', playSessionId: 'session-2' };

    const initialLoad = sourceSwitch.loadPlayback(initialPlayback, { isBoot: true });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });
    player.dispatchEvent({ type: 'playing' });
    await initialLoad;

    reporter.beforeSourceSwitch.mockClear();
    const nextLoad = sourceSwitch.loadPlayback(nextPlayback);
    await new Promise(resolve => setTimeout(resolve, 5));

    expect(reporter.beforeSourceSwitch).toHaveBeenCalled();

    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 5));
    player.dispatchEvent({ type: 'seeked' });
    player.dispatchEvent({ type: 'playing' });

    await nextLoad;
  });
});
