import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createJellyfinReporter } from '../../../../src/player/src/jellyfinReporter.js';
import { createMockPlayer, setupGlobals, restoreGlobals } from './helpers.js';

describe('createJellyfinReporter · Retries und Subtitles', () => {
  beforeEach(() => setupGlobals());
  afterEach(() => restoreGlobals());

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

  it('starts reports with subtitles disabled by default', async () => {
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
    expect(reports[0].payload.subtitleStreamIndex).toBeNull();

    reporter.destroy();
  });

  it('reports the manually selected subtitle stream index', async () => {
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
      audioStreamIndex: 2
    });
    reporter.setSubtitleStreamIndex(4);
    player.dispatchEvent({ type: 'playing' });
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(reports[0].event).toBe('start');
    expect(reports[0].payload.audioStreamIndex).toBe(2);
    expect(reports[0].payload.subtitleStreamIndex).toBe(4);

    reporter.destroy();
  });
});
