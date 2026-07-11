import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createSourceSwitch } from '../../src/sourceSwitch.js';

class MockEventTarget {
  constructor() {
    this.listeners = {};
    this.currentTime = 0;
    this.paused = true;
    this.muted = false;
    this.volume = 0.8;
    this.playbackRate = 1;
    this.duration = 0;
    this.seekable = { length: 0 };
    this.src = null;
  }

  addEventListener(event, handler) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(h => h !== handler);
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type] || [];
    handlers.forEach(handler => handler(event));
  }

  querySelector() {
    return {
      requestVideoFrameCallback(callback) {
        setTimeout(() => callback(), 5);
        return 1;
      },
      cancelVideoFrameCallback() {}
    };
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }
}

function setupGlobals() {
  global.window = {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    clearInterval: (id) => clearInterval(id),
    setInterval: (fn, ms) => setInterval(fn, ms),
    requestAnimationFrame: (fn) => setTimeout(fn, 0)
  };
}

function restoreGlobals() {
  delete global.window;
}

function createMockReporter() {
  return {
    getPosition: vi.fn(() => 0),
    setPlayback: vi.fn(),
    beforeSourceSwitch: vi.fn(() => Promise.resolve()),
    afterSourceSwitch: vi.fn(),
    stop: vi.fn(() => Promise.resolve())
  };
}

function createMockUi() {
  return {
    setState: vi.fn()
  };
}

function createMockCallbacks() {
  return {
    setLoading: vi.fn(),
    setLoadingStatus: vi.fn(),
    setInlineLoading: vi.fn(),
    showError: vi.fn(),
    hideError: vi.fn()
  };
}

describe('createSourceSwitch', () => {
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
