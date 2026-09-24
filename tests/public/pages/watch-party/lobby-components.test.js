import { describe, it, expect } from 'vitest';
import { memberState } from '../../../../src/public/js/pages/watch-party/lobby/roster.js';
import { memberHue } from '../../../../src/public/js/shared/members.js';
import { countdownMetaParts, formatPosition } from '../../../../src/public/js/pages/watch-party/helpers.js';
import { episodeLabel } from '../../../../src/public/js/pages/watch-party/lobby/hero.js';

describe('memberState', () => {
  it('zeigt in der Wartephase nur die Verbindung', () => {
    expect(memberState({ connected: true, ready: true }, { phase: 'waiting' })).toMatchObject({ key: 'connected', label: 'Verbunden' });
    expect(memberState({ connected: false }, { phase: 'waiting' })).toMatchObject({ key: 'waiting', label: 'Verbindet …' });
  });

  it('zeigt in der Bereit-Phase Ladefortschritt, Geladen, Bereit und Fehler', () => {
    expect(memberState({ connected: true, preloadState: 'preparing', preloadProgress: 0.42 }, { phase: 'ready' }))
      .toMatchObject({ key: 'preparing', label: 'Lädt 42 %', progress: 0.42 });
    expect(memberState({ connected: true, preloadState: 'loaded', preloadProgress: 1 }, { phase: 'ready' }))
      .toMatchObject({ key: 'loaded', label: 'Geladen' });
    expect(memberState({ connected: true, ready: true }, { phase: 'ready' })).toMatchObject({ key: 'ready', label: 'Bereit', progress: 1 });
    expect(memberState({ connected: true, preloadState: 'error', preloadMessage: 'Stream-Limit' }, { phase: 'ready' }))
      .toMatchObject({ key: 'error', label: 'Stream-Limit' });
    expect(memberState({ connected: false, preloadState: 'idle' }, { phase: 'ready' })).toMatchObject({ key: 'waiting', label: 'Offline' });
  });

  it('nimmt für die eigene Karte den lokalen Ladefortschritt', () => {
    expect(memberState({ connected: true, preloadState: 'preparing', preloadProgress: 0.1 }, { phase: 'ready', selfPreload: { progress: 0.8 } }))
      .toMatchObject({ label: 'Lädt 80 %', progress: 0.8 });
  });
});

describe('memberHue', () => {
  it('ist stabil und verteilt ähnliche IDs weit', () => {
    expect(memberHue('u-2')).toBe(memberHue('u-2'));
    const distance = Math.abs(memberHue('u-2') - memberHue('u-3'));
    expect(Math.min(distance, 360 - distance)).toBeGreaterThan(60);
  });
});

describe('Hero-Texte', () => {
  it('beschriftet Folgen und Fortsetzen-Punkte', () => {
    expect(episodeLabel({ seasonNumber: 2, episodeNumber: 7 })).toBe('S2 · F7');
    expect(episodeLabel({ seasonNumber: null, episodeNumber: 7 })).toBeNull();
    expect(formatPosition(0)).toBe('Von Anfang an');
    expect(formatPosition(3_725_000)).toBe('Fortsetzen bei 1:02:05');
  });

  it('baut die Meta-Zeile nur aus vorhandenen Angaben', () => {
    expect(countdownMetaParts({ productionYear: 2024, runtimeTicks: 36_000_000_000 })).toEqual(['2024', '60 Min.']);
    expect(countdownMetaParts({})).toEqual([]);
  });
});
