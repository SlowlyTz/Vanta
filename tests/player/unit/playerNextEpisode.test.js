import { describe, it, expect } from 'vitest';
import { shouldShowNextEpisodePrompt, canStartNextEpisode, createNextEpisodeGate } from '../../../src/player/src/nextEpisode.js';

describe('shouldShowNextEpisodePrompt', () => {
  it('triggert ab 90% Fortschritt', () => {
    expect(shouldShowNextEpisodePrompt({ currentTime: 90, duration: 100 })).toBe(true);
    expect(shouldShowNextEpisodePrompt({ currentTime: 89.9, duration: 100 })).toBe(false);
  });

  it('triggert nicht ohne gültige Dauer (z.B. Filme ohne Episode-Kontext werden separat gefiltert)', () => {
    expect(shouldShowNextEpisodePrompt({ currentTime: 10, duration: 0 })).toBe(false);
    expect(shouldShowNextEpisodePrompt({ currentTime: 10, duration: NaN })).toBe(false);
    expect(shouldShowNextEpisodePrompt({ currentTime: 10, duration: -5 })).toBe(false);
  });

  it('triggert nicht bei ungültiger currentTime', () => {
    expect(shouldShowNextEpisodePrompt({ currentTime: NaN, duration: 100 })).toBe(false);
  });

  it('respektiert einen individuellen threshold', () => {
    expect(shouldShowNextEpisodePrompt({ currentTime: 50, duration: 100, threshold: 0.5 })).toBe(true);
  });
});

describe('canStartNextEpisode', () => {
  it('erlaubt Start, wenn kein WatchTogether aktiv ist', () => {
    expect(canStartNextEpisode(null)).toBe(true);
    expect(canStartNextEpisode({ enabled: false })).toBe(true);
  });

  it('erlaubt Start für Admin/Owner in WatchTogether', () => {
    expect(canStartNextEpisode({ enabled: true, canControl: true })).toBe(true);
    expect(canStartNextEpisode({ enabled: true, isOwner: true })).toBe(true);
  });

  it('verweigert Start für Zuschauer in WatchTogether', () => {
    expect(canStartNextEpisode({ enabled: true, canControl: false, isOwner: false })).toBe(false);
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
