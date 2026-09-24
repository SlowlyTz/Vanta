import { describe, it, expect } from 'vitest';
import {
  shouldShowNextEpisodePrompt,
  computeNextEpisodeTimings,
  canStartNextEpisode,
  createNextEpisodeGate,
  NEXT_EPISODE_MIN_PROMPT_SECONDS
} from '../../../src/player/src/nextEpisode.js';

describe('computeNextEpisodeTimings', () => {
  it('setzt bei langen Folgen das Overlay auf 97% und den Skip auf 98,5%', () => {
    // 45 Minuten: der Abstand zwischen beiden Schwellen ist mit 40,5s ohnehin > 25s.
    const timings = computeNextEpisodeTimings({ duration: 2700 });
    expect(timings.promptAt).toBeCloseTo(2619, 5);
    expect(timings.skipAt).toBeCloseTo(2659.5, 5);
  });

  it('zieht das Overlay bei kurzen Folgen vor, statt den Skip nach hinten zu schieben', () => {
    // 22 Minuten: 1,5% sind nur ~19,8s, also greift die 25-Sekunden-Garantie.
    const timings = computeNextEpisodeTimings({ duration: 1320 });
    expect(timings.skipAt).toBeCloseTo(1300.2, 5);
    expect(timings.promptAt).toBeCloseTo(1275.2, 5);
    expect(timings.skipAt - timings.promptAt).toBeCloseTo(NEXT_EPISODE_MIN_PROMPT_SECONDS, 5);
  });

  it('hält die 25-Sekunden-Garantie über alle üblichen Laufzeiten ein', () => {
    for (const minutes of [8, 10, 15, 22, 28, 45, 60, 90]) {
      const timings = computeNextEpisodeTimings({ duration: minutes * 60 });
      expect(timings.skipAt - timings.promptAt).toBeGreaterThanOrEqual(NEXT_EPISODE_MIN_PROMPT_SECONDS - 1e-9);
      expect(timings.skipAt).toBeLessThan(minutes * 60);
    }
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
  });
});

describe('shouldShowNextEpisodePrompt', () => {
  it('triggert ab 97% Fortschritt, solange die 25s-Garantie nicht greift', () => {
    expect(shouldShowNextEpisodePrompt({ currentTime: 3492, duration: 3600 })).toBe(true);
    expect(shouldShowNextEpisodePrompt({ currentTime: 3491.9, duration: 3600 })).toBe(false);
  });

  it('triggert bei kurzen Folgen früher als 97%, damit 25s Vorlauf bleiben', () => {
    // 20 Minuten: promptAt liegt bei 1157s = 96,4%, nicht bei 97%.
    expect(shouldShowNextEpisodePrompt({ currentTime: 1157, duration: 1200 })).toBe(true);
    expect(shouldShowNextEpisodePrompt({ currentTime: 1156.9, duration: 1200 })).toBe(false);
    expect(1157 / 1200).toBeLessThan(0.97);
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
      promptThreshold: 0.5,
      minPromptSeconds: 0
    })).toBe(true);
    expect(shouldShowNextEpisodePrompt({
      currentTime: 49.9,
      duration: 100,
      promptThreshold: 0.5,
      minPromptSeconds: 0
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
