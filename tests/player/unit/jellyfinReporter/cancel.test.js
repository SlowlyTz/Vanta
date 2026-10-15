import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createJellyfinReporter } from '../../../../src/player/src/jellyfinReporter.js';
import { createMockPlayer, setupGlobals, restoreGlobals } from './helpers.js';

// A player left before playback started still holds a slot on the server.
describe('createJellyfinReporter · cancel before start', () => {
  let windowListeners;

  beforeEach(() => {
    const { mockWindow } = setupGlobals();
    windowListeners = {};
    mockWindow.addEventListener = (event, handler) => { windowListeners[event] = handler; };
  });
  afterEach(() => restoreGlobals());

  const createReporter = (state = {}) => {
    const reports = [];
    const player = createMockPlayer(state);
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: (event, payload, options) => {
        reports.push({ event, payload, options });
        return Promise.resolve();
      }
    });
    return { reports, player, reporter };
  };

  it('stop() before playing sends cancel once, never stopped', async () => {
    const { reports, reporter } = createReporter();
    reporter.setPlayback({ playSessionId: 'session-1' });

    await reporter.stop({ keepalive: true });
    await reporter.stop({ keepalive: true });

    expect(reports.map(r => r.event)).toEqual(['cancel']);
    expect(reports[0].payload.playSessionId).toBe('session-1');
    expect(reports[0].options.keepalive).toBe(true);
    reporter.destroy();
  });

  it('pagehide before playing sends cancel', () => {
    const { reports, reporter } = createReporter();
    reporter.setPlayback({ playSessionId: 'session-1' });

    windowListeners.pagehide({ persisted: false });

    expect(reports.map(r => r.event)).toEqual(['cancel']);
    reporter.destroy();
  });

  it('sends nothing without a play session', async () => {
    const { reports, reporter } = createReporter();
    await reporter.stop();
    expect(reports).toEqual([]);
    reporter.destroy();
  });

  it('a started stream still ends with stopped', async () => {
    const { reports, player, reporter } = createReporter({ currentTime: 30, paused: false });
    reporter.setPlayback({ playSessionId: 'session-1' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    await reporter.stop();

    expect(reports.map(r => r.event)).toEqual(['start', 'stopped']);
    reporter.destroy();
  });
});
