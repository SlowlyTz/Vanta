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

describe('createSourceSwitch · State und Load', () => {
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

  it('captures and restores playback state', () => {
    reporter.getPosition = vi.fn(() => 42);
    player.paused = false;
    player.volume = 0.5;
    player.muted = true;
    player.playbackRate = 1.5;
    sourceSwitch.setIntendsToPlay(true);

    const state = sourceSwitch.captureState();

    expect(state.position).toBe(42);
    expect(state.shouldPlay).toBe(true);
    expect(state.volume).toBe(0.5);
    expect(state.muted).toBe(true);
    expect(state.playbackRate).toBe(1.5);

    player.volume = 1;
    player.muted = false;
    player.playbackRate = 1;
    sourceSwitch.restoreState(state);

    expect(player.volume).toBe(0.5);
    expect(player.muted).toBe(true);
    expect(player.playbackRate).toBe(1.5);
  });

  it('loads playback and updates current playback', async () => {
    const playback = {
      url: '/api/media/playback/proxy?path=/video.mp4',
      delivery: 'http',
      playMethod: 'DirectPlay',
      mediaSourceId: 'source-1',
      playSessionId: 'session-1'
    };

    const loadPromise = sourceSwitch.loadPlayback(playback, { isBoot: true });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 120;
    player.dispatchEvent({ type: 'duration-change', detail: 120 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });
    player.dispatchEvent({ type: 'playing' });

    await loadPromise;

    expect(sourceSwitch.getCurrentPlayback()).toBe(playback);
    expect(reporter.setPlayback).toHaveBeenCalledWith(playback);
    expect(player.src.src).toBe(playback.url);
  });

  it('ignores stale load versions', async () => {
    const playback1 = { url: '/video1.mp4', delivery: 'http' };
    const playback2 = { url: '/video2.mp4', delivery: 'http' };

    const load1 = sourceSwitch.loadPlayback(playback1, { isBoot: true });
    const load2 = sourceSwitch.loadPlayback(playback2, { isBoot: true });

    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'can-play' });
    player.duration = 100;
    player.dispatchEvent({ type: 'duration-change', detail: 100 });
    await new Promise(resolve => setTimeout(resolve, 10));
    player.dispatchEvent({ type: 'seeked' });
    player.dispatchEvent({ type: 'playing' });

    await load2;
    await load1;

    expect(sourceSwitch.getCurrentPlayback()).toBe(playback2);
  });
});
