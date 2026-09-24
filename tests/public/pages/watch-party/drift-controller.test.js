import { describe, it, expect, vi } from 'vitest';
import {
  computeDriftAction,
  createDriftController,
  rateForDrift,
  timelinePositionAt,
  DRIFT_HARD_SEEK_MS,
  DEFAULT_SEEK_LATENCY_MS,
  SETTLE_AFTER_SEEK_MS
} from '../../../../src/public/js/pages/watch-party/driftController.js';
import { createFakeController } from './helpers.js';

const NOW = 1_000_000;
const playingAt = (positionMs, anchor = NOW) => ({ positionMs, playing: true, anchorServerTimeMs: anchor, seq: 1 });
const pausedAt = positionMs => ({ positionMs, playing: false, anchorServerTimeMs: NOW, seq: 1 });
const state = overrides => ({ ready: true, currentTime: 0, paused: false, busy: false, rate: 1, stableMs: 0, autoplayBlocked: false, ...overrides });

describe('timelinePositionAt', () => {
  it('rechnet eine laufende Zeitleiste ab dem Anker fort, eine pausierte nicht', () => {
    expect(timelinePositionAt(playingAt(10_000, NOW - 2_500), NOW)).toBe(12_500);
    expect(timelinePositionAt(pausedAt(10_000), NOW + 9_000)).toBe(10_000);
    expect(timelinePositionAt(playingAt(10_000, NOW + 400), NOW)).toBe(10_000);
    expect(timelinePositionAt(null, NOW)).toBe(0);
  });
});

describe('rateForDrift', () => {
  it('bremst bei Vorsprung, beschleunigt bei Rückstand und bleibt zwischen 2 und 6 %', () => {
    expect(rateForDrift(200)).toBeCloseTo(0.95);
    expect(rateForDrift(-200)).toBeCloseTo(1.05);
    expect(rateForDrift(30)).toBeCloseTo(0.98);
    expect(rateForDrift(-1_800)).toBeCloseTo(1.06);
  });
});

describe('computeDriftAction', () => {
  it('wartet, solange der Player nicht bereit ist oder puffert', () => {
    expect(computeDriftAction({ timeline: playingAt(0), state: state({ ready: false }), now: NOW }).type).toBe('idle');
    expect(computeDriftAction({ timeline: playingAt(0), state: state({ busy: true }), now: NOW }))
      .toMatchObject({ type: 'wait', status: 'buffering' });
  });

  it('tut unter 120 ms nichts und setzt die Rate zurück', () => {
    const action = computeDriftAction({ timeline: playingAt(10_000), state: state({ currentTime: 10.1 }), now: NOW });
    expect(action).toMatchObject({ type: 'hold', status: 'sync', rate: 1 });
    expect(action.driftMs).toBeCloseTo(100);
  });

  it('regelt 120 ms – 2 s über die Geschwindigkeit', () => {
    const ahead = computeDriftAction({ timeline: playingAt(10_000), state: state({ currentTime: 10.4 }), now: NOW });
    expect(ahead).toMatchObject({ type: 'rate', status: 'correcting' });
    expect(ahead.rate).toBeLessThan(1);

    const behind = computeDriftAction({ timeline: playingAt(10_000), state: state({ currentTime: 9 }), now: NOW });
    expect(behind.rate).toBeGreaterThan(1);
  });

  it('regelt nach dem Einsetzen weiter, bis die Abweichung unter 50 ms liegt', () => {
    const input = { timeline: playingAt(10_000), state: state({ currentTime: 10.08 }), now: NOW };
    expect(computeDriftAction(input).type).toBe('hold');
    expect(computeDriftAction({ ...input, correcting: true }).type).toBe('rate');
    expect(computeDriftAction({ ...input, correcting: true, state: state({ currentTime: 10.03 }) }).type).toBe('hold');
  });

  it('springt über 2 s hart und zielt um die Seek-Dauer voraus', () => {
    const action = computeDriftAction({ timeline: playingAt(60_000), state: state({ currentTime: 10 }), now: NOW, seekLatencyMs: 300 });
    expect(action).toMatchObject({ type: 'seek', seekToMs: 60_300 });
  });

  it('lässt dem Player nach einem harten Sprung Zeit zum Einschwingen', () => {
    const action = computeDriftAction({
      timeline: playingAt(60_000),
      state: state({ currentTime: 50 }),
      now: NOW,
      lastHardSeekAt: NOW - SETTLE_AFTER_SEEK_MS + 100
    });
    expect(action.type).toBe('settle');
  });

  it('startet einen pausierten Player, wenn die Zeitleiste läuft', () => {
    expect(computeDriftAction({ timeline: playingAt(10_000), state: state({ currentTime: 10, paused: true }), now: NOW }))
      .toMatchObject({ type: 'play', seekToMs: null });

    const far = computeDriftAction({ timeline: playingAt(10_000), state: state({ currentTime: 1, paused: true }), now: NOW });
    expect(far.seekToMs).toBe(10_000 + DEFAULT_SEEK_LATENCY_MS);
  });

  it('versucht es bei blockiertem Autoplay nicht erneut', () => {
    expect(computeDriftAction({ timeline: playingAt(0), state: state({ paused: true, autoplayBlocked: true }), now: NOW }).type)
      .toBe('blocked');
  });

  it('hält eine pausierte Party exakt auf der Position fest', () => {
    expect(computeDriftAction({ timeline: pausedAt(30_000), state: state({ currentTime: 31, paused: false }), now: NOW }))
      .toMatchObject({ type: 'paused', pause: true, seekToMs: 30_000 });
    expect(computeDriftAction({ timeline: pausedAt(30_000), state: state({ currentTime: 30.1, paused: true }), now: NOW }))
      .toMatchObject({ type: 'paused', pause: false, seekToMs: null });
  });
});

describe('createDriftController', () => {
  const setup = ({ timeline, now = () => NOW } = {}) => {
    const controller = createFakeController();
    const onStatus = vi.fn();
    const onHardSeek = vi.fn();
    const onAutoplayBlocked = vi.fn();
    let current = timeline;
    const drift = createDriftController({
      getController: () => controller,
      getTimeline: () => current,
      now,
      onStatus,
      onHardSeek,
      onAutoplayBlocked,
      setTimer: vi.fn(() => 1),
      clearTimer: vi.fn()
    });
    return { controller, drift, onStatus, onHardSeek, onAutoplayBlocked, setTimeline: next => { current = next; } };
  };

  it('bringt einen weit entfernten Player per Sprung auf die Zeitleiste und meldet das', () => {
    const { controller, drift, onHardSeek } = setup({ timeline: playingAt(90_000) });
    controller.player.paused = false;
    controller.player.currentTime = 10;

    drift.tick();

    expect(controller.syncSeek).toHaveBeenCalledWith((90_000 + DEFAULT_SEEK_LATENCY_MS) / 1000);
    expect(onHardSeek).toHaveBeenCalled();
  });

  it('lernt aus dem Rückstand nach einem Sprung eine längere Vorhaltezeit', () => {
    let now = NOW;
    const { controller, drift } = setup({ timeline: playingAt(90_000), now: () => now });
    controller.player.paused = false;
    controller.player.currentTime = 10;
    drift.tick();

    // The seek landed 400 ms behind although it aimed 150 ms ahead.
    now += SETTLE_AFTER_SEEK_MS + 100;
    controller.player.currentTime = (90_000 + SETTLE_AFTER_SEEK_MS + 100 - 400) / 1000;
    drift.tick();

    expect(drift.status.seekLatencyMs).toBeGreaterThan(DEFAULT_SEEK_LATENCY_MS);
    expect(drift.status.seekLatencyMs).toBeLessThanOrEqual(DEFAULT_SEEK_LATENCY_MS + 400);
  });

  it('setzt die Rate bei kleiner Abweichung und wieder auf 1, wenn sie aufgeholt ist', () => {
    const { controller, drift } = setup({ timeline: playingAt(10_000) });
    controller.player.paused = false;
    controller.player.currentTime = 10.5;

    drift.tick();
    expect(controller.player.playbackRate).toBeLessThan(1);

    controller.player.currentTime = 10.02;
    drift.tick();
    expect(controller.player.playbackRate).toBe(1);
  });

  it('meldet blockiertes Autoplay genau einmal', async () => {
    const { controller, drift, onAutoplayBlocked } = setup({ timeline: playingAt(0) });
    controller.blockNextPlay();

    drift.tick();
    await Promise.resolve();
    await Promise.resolve();
    drift.tick();
    drift.tick();

    expect(onAutoplayBlocked).toHaveBeenCalledTimes(1);
    expect(controller.syncPlay).toHaveBeenCalledTimes(1);
  });

  it('meldet den Status für Anzeige und Debug-Overlay', () => {
    const { controller, drift, onStatus } = setup({ timeline: playingAt(10_000) });
    controller.player.paused = false;
    controller.player.currentTime = 10.04;

    drift.tick();

    expect(onStatus).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'sync', rate: 1 }));
    expect(onStatus.mock.calls.at(-1)[0].driftMs).toBeCloseTo(40);
  });

  it('springt bei resync sofort auf die Zeitleiste', () => {
    const { controller, drift } = setup({ timeline: pausedAt(42_000) });
    controller.player.currentTime = 41.8;

    drift.resync();

    expect(controller.syncSeek).toHaveBeenCalledWith(42);
  });

  it('startet und stoppt die Schleife nur einmal', () => {
    const { drift } = setup({ timeline: pausedAt(0) });
    drift.start();
    drift.start();
    expect(drift.running).toBe(true);
    drift.stop();
    expect(drift.running).toBe(false);
  });

  it('bleibt ohne Zeitleiste ruhig und fasst den Player nicht an', () => {
    const { controller, drift } = setup({ timeline: null });
    expect(drift.tick().type).toBe('idle');
    expect(controller.syncSeek).not.toHaveBeenCalled();
    expect(controller.syncPlay).not.toHaveBeenCalled();
  });

  it('springt erst ab mehr als 2 s Abweichung', () => {
    const { controller, drift } = setup({ timeline: playingAt(10_000) });
    controller.player.paused = false;
    controller.player.currentTime = (10_000 + DRIFT_HARD_SEEK_MS - 50) / 1000;
    drift.tick();
    expect(controller.syncSeek).not.toHaveBeenCalled();
  });
});
