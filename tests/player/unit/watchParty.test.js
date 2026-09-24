import { describe, it, expect } from 'vitest';
import { applyWatchPartyPermissions, computeRemoteControlTarget } from '../../../src/player/src/watchParty.js';

function createRoot() {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="vanta-player-party-pill" hidden></div>
    <div class="vanta-player-center-controls vanta-player-transport"><button class="vanta-player-play"></button></div>
    <div class="vanta-player-transport vanta-player-transport-bar"><button class="vanta-player-seek"></button></div>
    <media-time-slider></media-time-slider>
    <media-mute-button></media-mute-button>
    <media-gesture class="toggle" action="toggle:paused"></media-gesture>
    <media-gesture class="left" action="seek:-10"></media-gesture>`;
  return root;
}

const transport = root => [...root.querySelectorAll('.vanta-player-transport')];

describe('applyWatchPartyPermissions', () => {
  it('lässt den Player für Admins unverändert', () => {
    const root = createRoot();
    applyWatchPartyPermissions({ root, watchParty: { enabled: true, canControl: true } });

    expect(root.classList.contains('is-watch-party-viewer')).toBe(false);
    expect(transport(root).every(control => !control.inert)).toBe(true);
    expect(root.querySelector('.vanta-player-party-pill').hidden).toBe(true);
  });

  it('lässt den Player außerhalb einer Watch Party unverändert', () => {
    const root = createRoot();
    applyWatchPartyPermissions({ root, watchParty: null });
    expect(root.classList.contains('is-watch-party-viewer')).toBe(false);
  });

  it('blendet für Zuschauer Play, Spulen und die bedienbare Zeitleiste aus und zeigt „Admin steuert“', () => {
    const root = createRoot();
    applyWatchPartyPermissions({ root, watchParty: { enabled: true, isOwner: false } });

    expect(root.classList.contains('is-watch-party-viewer')).toBe(true);
    expect(transport(root).every(control => control.inert && control.getAttribute('aria-hidden') === 'true')).toBe(true);
    // The timeline stays visible as a display: inert, but never aria-hidden
    // (vidstack would hide it entirely).
    const timeline = root.querySelector('media-time-slider');
    expect(timeline.inert).toBe(true);
    expect(timeline.hasAttribute('aria-hidden')).toBe(false);
    expect(root.querySelector('.vanta-player-party-pill').hidden).toBe(false);
    // Volume stays with the viewer.
    expect(root.querySelector('media-mute-button').inert).toBeFalsy();
  });

  it('nimmt Zuschauern Klick- und Doppeltipp-Gesten', () => {
    const root = createRoot();
    applyWatchPartyPermissions({ root, watchParty: { enabled: true, isOwner: false } });

    root.querySelectorAll('media-gesture').forEach(gesture => {
      expect(gesture.getAttribute('action')).toBeNull();
      expect(gesture.style.pointerEvents).toBe('none');
    });
  });

  it('canControl hat Vorrang vor isOwner', () => {
    const promoted = createRoot();
    applyWatchPartyPermissions({ root: promoted, watchParty: { enabled: true, isOwner: false, canControl: true } });
    expect(promoted.classList.contains('is-watch-party-viewer')).toBe(false);

    const demoted = createRoot();
    applyWatchPartyPermissions({ root: demoted, watchParty: { enabled: true, isOwner: true, canControl: false } });
    expect(demoted.classList.contains('is-watch-party-viewer')).toBe(true);
  });

  it('gibt alles zurück, wenn ein Zuschauer während der Party zum Admin wird', () => {
    const root = createRoot();
    applyWatchPartyPermissions({ root, watchParty: { enabled: true, canControl: false } });
    applyWatchPartyPermissions({ root, watchParty: { enabled: true, canControl: true } });

    expect(root.classList.contains('is-watch-party-viewer')).toBe(false);
    expect(transport(root).every(control => !control.inert && !control.hasAttribute('aria-hidden'))).toBe(true);
    expect(root.querySelector('media-gesture.toggle').getAttribute('action')).toBe('toggle:paused');
    expect(root.querySelector('media-gesture.left').getAttribute('action')).toBe('seek:-10');
    expect(root.querySelector('.vanta-player-party-pill').hidden).toBe(true);
  });
});

describe('computeRemoteControlTarget', () => {
  it('berechnet die Zielposition für pause und pausiert ohne Zeitkompensation', () => {
    const result = computeRemoteControlTarget({
      action: 'pause',
      positionMs: 42_000,
      serverTimeMs: Date.now(),
      playing: false,
      currentTime: 0
    });

    expect(result.targetSeconds).toBe(42);
    expect(result.shouldSeek).toBe(true);
    expect(result.shouldPlay).toBe(false);
    expect(result.shouldPause).toBe(true);
  });

  it('kompensiert die verstrichene Zeit für play und startet die Wiedergabe', () => {
    const serverTimeMs = Date.now() - 3000;

    const result = computeRemoteControlTarget({
      action: 'play',
      positionMs: 10_000,
      serverTimeMs,
      playing: true,
      currentTime: 10
    });

    expect(result.targetSeconds).toBeCloseTo(13, 0);
    expect(result.shouldPlay).toBe(true);
    expect(result.shouldPause).toBe(false);
  });

  it('seekt nur, wenn die Abweichung größer als 0.75s ist', () => {
    const closeEnough = computeRemoteControlTarget({
      action: 'pause',
      positionMs: 10_000,
      serverTimeMs: Date.now(),
      playing: false,
      currentTime: 10.3
    });
    expect(closeEnough.shouldSeek).toBe(false);

    const tooFar = computeRemoteControlTarget({
      action: 'pause',
      positionMs: 10_000,
      serverTimeMs: Date.now(),
      playing: false,
      currentTime: 12
    });
    expect(tooFar.shouldSeek).toBe(true);
  });
});
