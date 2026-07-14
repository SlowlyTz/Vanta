import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createJellyfinReporter } from '../../../../src/player/src/jellyfinReporter.js';
import { createMockPlayer, setupGlobals, restoreGlobals } from './helpers.js';

describe('createJellyfinReporter · Stop und Destroy', () => {
  beforeEach(() => setupGlobals());
  afterEach(() => restoreGlobals());

  it('passes keepalive option through to report on stop', async () => {
    const reports = [];
    const player = createMockPlayer({ currentTime: 20, paused: false });
    const reporter = createJellyfinReporter({
      player,
      itemId: 'item-1',
      report: (event, payload, options) => {
        reports.push({ event, payload, options });
        return Promise.resolve();
      }
    });

    reporter.setPlayback({ playSessionId: 'session-1' });
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    await reporter.stop({ keepalive: true });

    const stoppedReports = reports.filter(r => r.event === 'stopped');
    expect(stoppedReports).toHaveLength(1);
    expect(stoppedReports[0].options.keepalive).toBe(true);

    reporter.destroy();
  });

  it('does not send a second stopped report after destroy', async () => {
    const reports = [];
    const player = createMockPlayer({ currentTime: 25, paused: false });
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

    const stopPromise = reporter.stop({ keepalive: true });
    reporter.destroy();
    await stopPromise;

    const stoppedReports = reports.filter(r => r.event === 'stopped');
    expect(stoppedReports).toHaveLength(1);
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
});
