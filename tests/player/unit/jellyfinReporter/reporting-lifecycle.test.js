import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createJellyfinReporter } from '../../../../src/player/src/jellyfinReporter.js';
import { createMockPlayer, setupGlobals, restoreGlobals } from './helpers.js';

describe('createJellyfinReporter · Reporting Lifecycle', () => {
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
});
