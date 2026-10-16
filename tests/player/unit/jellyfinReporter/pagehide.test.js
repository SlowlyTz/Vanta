import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createJellyfinReporter } from '../../../../src/player/src/jellyfinReporter.js';
import { createMockPlayer, setupGlobals, restoreGlobals } from './helpers.js';

describe('createJellyfinReporter · closing and coming back', () => {
  let windowListeners;

  beforeEach(() => {
    const { mockWindow } = setupGlobals();
    windowListeners = {};
    mockWindow.addEventListener = (event, handler) => { windowListeners[event] = handler; };
  });
  afterEach(() => restoreGlobals());

  const playing = async () => {
    const reports = [];
    const player = createMockPlayer({ currentTime: 30, paused: false });
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: (event, payload, options) => {
        reports.push({ event, options });
        return Promise.resolve();
      }
    });
    reporter.setPlayback({ playSessionId: 'session-1' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));
    return { reports, player, reporter };
  };

  it('a tab that closes or reloads sends its stop with keepalive', async () => {
    const { reports, reporter } = await playing();
    windowListeners.pagehide({ persisted: false });
    expect(reports.at(-1)).toEqual({ event: 'stopped', options: { keepalive: true } });
    reporter.destroy();
  });

  it('back from the back/forward cache, the stream starts again', async () => {
    const { reports, player, reporter } = await playing();
    windowListeners.pagehide({ persisted: true });
    windowListeners.pageshow({ persisted: true });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(reports.map(r => r.event)).toEqual(['start', 'stopped', 'start']);

    player.paused = true;
    player.dispatchEvent({ type: 'pause' });
    await reporter.stop();
    expect(reports.at(-1).event).toBe('stopped');
    reporter.destroy();
  });

  it('a normal page show changes nothing', async () => {
    const { reports, reporter } = await playing();
    windowListeners.pageshow({ persisted: false });
    expect(reports.map(r => r.event)).toEqual(['start']);
    reporter.destroy();
  });
});
