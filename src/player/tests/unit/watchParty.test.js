import { describe, it, expect } from 'vitest';
import { applyWatchPartyPermissions, computeRemoteControlTarget } from '../../src/watchParty.js';

function createFakeControl() {
  const attributes = {};
  return {
    style: {},
    setAttribute(name, value) { attributes[name] = value; },
    getAttribute(name) { return attributes[name] ?? null; }
  };
}

function createFakeRoot(controls) {
  const classes = new Set();
  return {
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      contains: (name) => classes.has(name)
    },
    querySelectorAll: () => controls
  };
}

describe('applyWatchPartyPermissions', () => {
  it('lässt den Player für den Owner unverändert', () => {
    const controls = [createFakeControl()];
    const root = createFakeRoot(controls);

    applyWatchPartyPermissions({ root, watchParty: { enabled: true, isOwner: true } });

    expect(root.classList.contains('is-watch-party-viewer')).toBe(false);
    expect(controls[0].getAttribute('aria-disabled')).toBeNull();
  });

  it('lässt den Player unverändert, wenn kein Watch-Party-Modus aktiv ist', () => {
    const controls = [createFakeControl()];
    const root = createFakeRoot(controls);

    applyWatchPartyPermissions({ root, watchParty: null });

    expect(root.classList.contains('is-watch-party-viewer')).toBe(false);
  });

  it('deaktiviert Play-/Seek-Controls für Viewer, lässt Lautstärke aber unangetastet', () => {
    const playControl = createFakeControl();
    const root = createFakeRoot([playControl]);

    applyWatchPartyPermissions({ root, watchParty: { enabled: true, isOwner: false } });

    expect(root.classList.contains('is-watch-party-viewer')).toBe(true);
    expect(playControl.getAttribute('aria-disabled')).toBe('true');
    expect(playControl.style.pointerEvents).toBe('none');

    // Volume controls are intentionally excluded from the locked-control selector,
    // so querySelectorAll (and this whole flow) never touches them.
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
