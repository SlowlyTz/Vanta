import { describe, it, expect } from 'vitest';
import { applyWatchPartyPermissions } from '../../../src/player/src/watchParty.js';

function createRoot() {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="vanta-player-party-pill" hidden></div>
    <div class="vanta-player-center-controls vanta-player-transport"><button class="vanta-player-play"></button></div>
    <div class="vanta-player-transport vanta-player-transport-bar"><button class="vanta-player-seek"></button></div>
    <media-time-slider></media-time-slider>
    <media-mute-button></media-mute-button>
`;
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
    expect(root.querySelector('.vanta-player-party-pill').hidden).toBe(true);
  });
});
