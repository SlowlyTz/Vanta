import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createJellyfinReporter } from '../../src/jellyfinReporter.js';

class MockEventTarget {
  constructor() {
    this.listeners = {};
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
}

function createMockPlayer(state = {}) {
  const player = new MockEventTarget();
  player.currentTime = state.currentTime ?? 0;
  player.paused = state.paused ?? true;
  player.muted = state.muted ?? false;
  player.volume = state.volume ?? 1;
  player.playbackRate = state.playbackRate ?? 1;
  return player;
}

function createMockGlobals() {
  const timers = [];
  const windows = [];

  return {
    setTimeout: (fn, ms) => {
      const id = setTimeout(fn, ms);
      timers.push(id);
      return id;
    },
    clearInterval: (id) => clearInterval(id),
    setInterval: (fn, ms) => {
      const id = setInterval(fn, ms);
      timers.push(id);
      return id;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    _timers: timers,
    _windows: windows
  };
}

function setupGlobals() {
  const mockWindow = createMockGlobals();
  const mockDocument = new MockEventTarget();
  mockDocument.hidden = false;
  global.window = mockWindow;
  global.document = mockDocument;
  return { mockWindow, mockDocument };
}

function restoreGlobals() {
  delete global.window;
  delete global.document;
}

describe('createJellyfinReporter', () => {
  beforeEach(() => setupGlobals());
  afterEach(() => restoreGlobals());

  it('sends start and periodic progress', async () => {
    const reports = [];
    const player = createMockPlayer({ currentTime: 5, paused: false });
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: (event, payload) => {
        reports.push({ event, payload });
        return Promise.resolve();
      }
    });

    reporter.setPlayback({ playSessionId: 'session-1' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(reports[0].event).toBe('start');
    expect(reports[0].payload.positionTicks).toBe(50_000_000);

    reporter.destroy();
  });

  it('does not send stopped during internal source switch', async () => {
    const reports = [];
    const player = createMockPlayer({ currentTime: 30, paused: false });
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: (event, payload) => {
        reports.push({ event, payload });
        return Promise.resolve();
      }
    });

    reporter.setPlayback({ playSessionId: 'session-1' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    await reporter.beforeSourceSwitch();
    reporter.setPlayback({ playSessionId: 'session-2' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    const stoppedReports = reports.filter(r => r.event === 'stopped');
    expect(stoppedReports).toHaveLength(0);

    reporter.destroy();
  });

  it('sends progress immediately on pause and seeked', async () => {
    const reports = [];
    const player = createMockPlayer({ currentTime: 10, paused: false });
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: (event, payload) => {
        reports.push({ event, payload });
        return Promise.resolve();
      }
    });

    reporter.setPlayback({ playSessionId: 'session-1' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    player.currentTime = 25;
    player.dispatchEvent({ type: 'pause' });
    await new Promise(resolve => setTimeout(resolve, 10));

    const progressReports = reports.filter(r => r.event === 'progress');
    expect(progressReports.length).toBeGreaterThanOrEqual(1);
    expect(progressReports[progressReports.length - 1].payload.positionTicks).toBe(250_000_000);

    reporter.destroy();
  });

  it('sends ended only once', async () => {
    const reports = [];
    const player = createMockPlayer({ currentTime: 100, paused: false });
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: (event, payload) => {
        reports.push({ event, payload });
        return Promise.resolve();
      }
    });

    reporter.setPlayback({ playSessionId: 'session-1' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    player.dispatchEvent({ type: 'ended' });
    player.dispatchEvent({ type: 'ended' });
    await new Promise(resolve => setTimeout(resolve, 10));

    const endedReports = reports.filter(r => r.event === 'ended');
    expect(endedReports).toHaveLength(1);

    reporter.destroy();
  });

  it('stops at most once per real session', async () => {
    const reports = [];
    const player = createMockPlayer({ currentTime: 15, paused: true });
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: (event, payload) => {
        reports.push({ event, payload });
        return Promise.resolve();
      }
    });

    reporter.setPlayback({ playSessionId: 'session-1' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    await reporter.stop();
    await reporter.stop();
    await reporter.stop();

    const stoppedReports = reports.filter(r => r.event === 'stopped');
    expect(stoppedReports).toHaveLength(1);

    reporter.destroy();
  });

  it('does not reset confirmed position backwards to 0', async () => {
    const reports = [];
    const player = createMockPlayer({ currentTime: 60, paused: false });
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: (event, payload) => {
        reports.push({ event, payload });
        return Promise.resolve();
      }
    });

    reporter.setPlayback({ playSessionId: 'session-1' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(reports[0].payload.positionTicks).toBe(600_000_000);

    player.currentTime = 0;
    player.dispatchEvent({ type: 'pause' });
    player.dispatchEvent({ type: 'seeked' });
    await new Promise(resolve => setTimeout(resolve, 10));

    const progressReports = reports.filter(r => r.event === 'progress');
    expect(progressReports.length).toBe(0);

    reporter.destroy();
  });

  it('cleans up timers and listeners on destroy', async () => {
    const player = createMockPlayer();
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: () => Promise.resolve()
    });

    reporter.setPlayback({ playSessionId: 'session-1' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    const initialListenerCount = Object.values(player.listeners).flat().length;
    expect(initialListenerCount).toBeGreaterThan(0);

    reporter.destroy();

    expect(Object.values(player.listeners).flat().length).toBe(0);
  });

  it('retries failed reports a limited number of times', async () => {
    const reports = [];
    const player = createMockPlayer({ currentTime: 5, paused: false });
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: (event) => {
        reports.push(event);
        return Promise.reject(new Error('network'));
      }
    });

    reporter.setPlayback({ playSessionId: 'session-1' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 250));

    const startReports = reports.filter(e => e === 'start');
    expect(startReports.length).toBe(4);

    reporter.destroy();
  });

  it('includes audio and subtitle stream indices from playback', async () => {
    const reports = [];
    const player = createMockPlayer({ currentTime: 10, paused: false });
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: (event, payload) => {
        reports.push({ event, payload });
        return Promise.resolve();
      }
    });

    reporter.setPlayback({
      playSessionId: 'session-1',
      audioStreamIndex: 2,
      subtitleStreamIndex: -1
    });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(reports[0].event).toBe('start');
    expect(reports[0].payload.audioStreamIndex).toBe(2);
    expect(reports[0].payload.subtitleStreamIndex).toBe(-1);

    reporter.destroy();
  });
});
