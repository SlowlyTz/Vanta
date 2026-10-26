import { describe, it, expect } from 'vitest';
import {
  shouldShowNextEpisodePrompt,
  computeNextEpisodeTimings,
  canStartNextEpisode,
  createNextEpisodeGate,
  nextEpisodeSkipAt,
  NEXT_EPISODE_COUNTDOWN_SECONDS
} from '../../../src/public/js/shared/nextEpisode.js';

describe('computeNextEpisodeTimings', () => {
  it('zeigt das Overlay ohne Abspann bei 97 % und zählt bis kurz vor das Dateiende', () => {
    const timings = computeNextEpisodeTimings({ duration: 2700 });
    expect(timings.promptAt).toBeCloseTo(2619, 5);
    expect(timings.skipAt).toBeCloseTo(2699.5, 5);
    expect(timings.source).toBe('runtime');
  });

  it('zieht das Overlay bei kurzen Clips vor, damit die 10 s vor dem Dateiende passen', () => {
    // 5 Minuten: 3 % sind nur 9 s.
    const timings = computeNextEpisodeTimings({ duration: 300 });
    expect(timings.promptAt).toBeCloseTo(289.5, 5);
    expect(timings.skipAt).toBeCloseTo(299.5, 5);
  });

  it('lässt ohne Abspann mindestens 10 s zwischen Overlay und Wechsel, der erst am Dateiende kommt', () => {
    for (const minutes of [8, 10, 15, 22, 28, 45, 60, 90]) {
      const timings = computeNextEpisodeTimings({ duration: minutes * 60 });
      expect(timings.skipAt - timings.promptAt).toBeGreaterThanOrEqual(NEXT_EPISODE_COUNTDOWN_SECONDS - 1e-9);
      expect(timings.skipAt).toBeCloseTo(minutes * 60 - 0.5, 5);
    }
  });

  it('startet mit Abspann-Segment 10 s nach dessen Beginn', () => {
    const timings = computeNextEpisodeTimings({ duration: 2700, outro: { startMs: 2550_000, endMs: 2690_000 } });
    expect(timings.promptAt).toBe(2550);
    expect(timings.skipAt).toBe(2560);
    expect(timings.source).toBe('outro');
  });

  it('gibt null ohne gültige Dauer zurück', () => {
    expect(computeNextEpisodeTimings({ duration: 0 })).toBeNull();
    expect(computeNextEpisodeTimings({ duration: NaN })).toBeNull();
    expect(computeNextEpisodeTimings({ duration: -5 })).toBeNull();
    expect(computeNextEpisodeTimings()).toBeNull();
  });

  it('klemmt promptAt nicht unter null, auch bei sehr kurzen Clips', () => {
    const timings = computeNextEpisodeTimings({ duration: 10 });
    expect(timings.promptAt).toBe(0);
    expect(timings.skipAt).toBe(9.5);
  });
});

describe('nextEpisodeSkipAt', () => {
  const timings = { promptAt: 2400, skipAt: 2410 };

  it('übernimmt den geplanten Wechsel, wenn das Overlay pünktlich erscheint', () => {
    expect(nextEpisodeSkipAt(timings, 2400.2, 2600)).toBe(2410);
  });

  it('gibt nach einem Sprung in den Abspann wieder volle 10 s', () => {
    expect(nextEpisodeSkipAt(timings, 2500, 2600)).toBe(2510);
  });

  it('bleibt vor dem Dateiende', () => {
    expect(nextEpisodeSkipAt(timings, 2595, 2600)).toBe(2599.5);
  });

  it('gibt null ohne Timings zurück', () => {
    expect(nextEpisodeSkipAt(null, 10, 100)).toBeNull();
  });
});

describe('shouldShowNextEpisodePrompt', () => {
  it('triggert ab 97% Fortschritt', () => {
    expect(shouldShowNextEpisodePrompt({ currentTime: 3492, duration: 3600 })).toBe(true);
    expect(shouldShowNextEpisodePrompt({ currentTime: 3491.9, duration: 3600 })).toBe(false);
  });

  it('triggert bei sehr kurzen Clips früher als 97%, damit 10 s Vorlauf bleiben', () => {
    // 5 Minuten: promptAt liegt bei 289,5 s = 96,5 %.
    expect(shouldShowNextEpisodePrompt({ currentTime: 289.5, duration: 300 })).toBe(true);
    expect(shouldShowNextEpisodePrompt({ currentTime: 289.4, duration: 300 })).toBe(false);
  });

  it('triggert nicht ohne gültige Dauer (z.B. Filme ohne Episode-Kontext werden separat gefiltert)', () => {
    expect(shouldShowNextEpisodePrompt({ currentTime: 10, duration: 0 })).toBe(false);
    expect(shouldShowNextEpisodePrompt({ currentTime: 10, duration: NaN })).toBe(false);
    expect(shouldShowNextEpisodePrompt({ currentTime: 10, duration: -5 })).toBe(false);
  });

  it('triggert nicht bei ungültiger currentTime', () => {
    expect(shouldShowNextEpisodePrompt({ currentTime: NaN, duration: 100 })).toBe(false);
  });

  it('respektiert individuelle Schwellen', () => {
    expect(shouldShowNextEpisodePrompt({
      currentTime: 50,
      duration: 100,
      promptThreshold: 0.5
    })).toBe(true);
    expect(shouldShowNextEpisodePrompt({
      currentTime: 49.9,
      duration: 100,
      promptThreshold: 0.5
    })).toBe(false);
  });
});

describe('canStartNextEpisode', () => {
  it('erlaubt Start, wenn kein WatchTogether aktiv ist', () => {
    expect(canStartNextEpisode(null)).toBe(true);
    expect(canStartNextEpisode({ enabled: false })).toBe(true);
  });

  it('erlaubt Start für Admin/Owner in WatchTogether', () => {
    expect(canStartNextEpisode({ enabled: true, canControl: true })).toBe(true);
  });

  it('verweigert Start für Zuschauer in WatchTogether', () => {
    expect(canStartNextEpisode({ enabled: true, canControl: false })).toBe(false);
  });
});

describe('createNextEpisodeGate', () => {
  it('triggert einmal pro Episode und blockiert danach', () => {
    const gate = createNextEpisodeGate();
    expect(gate.shouldTrigger('ep-1')).toBe(true);
    gate.markShown('ep-1');
    expect(gate.shouldTrigger('ep-1')).toBe(false);
  });

  it('blockiert dauerhaft nach markDismissed für dieselbe Episode', () => {
    const gate = createNextEpisodeGate();
    gate.markDismissed('ep-1');
    expect(gate.shouldTrigger('ep-1')).toBe(false);
  });

  it('erlaubt erneutes Triggern für eine andere Episode', () => {
    const gate = createNextEpisodeGate();
    gate.markShown('ep-1');
    gate.markDismissed('ep-1');
    expect(gate.shouldTrigger('ep-2')).toBe(true);
  });

  it('ignoriert markDismissed ohne episodeId', () => {
    const gate = createNextEpisodeGate();
    gate.markDismissed(undefined);
    expect(gate.shouldTrigger('ep-1')).toBe(true);
  });

  it('gibt false für leere episodeId zurück', () => {
    const gate = createNextEpisodeGate();
    expect(gate.shouldTrigger(null)).toBe(false);
    expect(gate.shouldTrigger('')).toBe(false);
  });
});
