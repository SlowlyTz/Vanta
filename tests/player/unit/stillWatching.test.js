import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bindStillWatching, createIdlePlaybackCounter } from '../../../src/player/src/stillWatching.js';

const HOUR = 60 * 60 * 1000;

function setup({ afterMs = 4 * HOUR, initialIdleMs = 0, watchParty = null, tvMode = false } = {}) {
  document.body.innerHTML = '<div class="vanta-player-root"><div class="vanta-player-shell"></div></div>';
  const root = document.querySelector('.vanta-player-root');
  const player = Object.assign(new EventTarget(), {
    paused: false,
    play: vi.fn(async () => {
      player.paused = false;
      player.dispatchEvent(new Event('play'));
    }),
    pause: vi.fn(() => { player.paused = true; })
  });
  const disposers = [];
  const onIdleChange = vi.fn();
  const context = {
    root,
    player,
    watchParty,
    tvMode,
    disposers,
    onBack: vi.fn(),
    stillWatching: { afterMs, initialIdleMs, onIdleChange },
    listen: (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      disposers.push(() => target.removeEventListener(type, handler, options));
    }
  };
  const bound = bindStillWatching(context);
  const dialog = () => root.querySelector('.vanta-still-watching');
  return { context, player, root, bound, dialog, onIdleChange, dispose: () => disposers.forEach(fn => fn()) };
}

describe('createIdlePlaybackCounter', () => {
  it('reports when the limit is reached and starts over on reset', () => {
    const counter = createIdlePlaybackCounter({ limitMs: 3000, initialMs: 1000 });
    expect(counter.add(1000)).toBe(false);
    expect(counter.add(1000)).toBe(true);
    counter.reset();
    expect(counter.value()).toBe(0);
  });
});

describe('bindStillWatching', () => {
  let current;
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    current?.dispose();
    vi.useRealTimers();
  });

  it('pauses and asks after the set playback time without input', () => {
    current = setup({ afterMs: 5000 });
    vi.advanceTimersByTime(4000);
    expect(current.dialog().hidden).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(current.player.pause).toHaveBeenCalled();
    expect(current.dialog().hidden).toBe(false);
    expect(document.activeElement.textContent).toBe('Ja, weiter');
  });

  it('does not count paused time', () => {
    current = setup({ afterMs: 3000 });
    current.player.paused = true;
    vi.advanceTimersByTime(10_000);
    expect(current.dialog().hidden).toBe(true);
  });

  it('starts over with any input in the player', () => {
    current = setup({ afterMs: 3000 });
    vi.advanceTimersByTime(2000);
    current.root.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(2000);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    vi.advanceTimersByTime(2000);
    expect(current.dialog().hidden).toBe(true);
    current.context.noteActivity();
    expect(current.onIdleChange).toHaveBeenLastCalledWith(0);
  });

  it('carries the count of the previous episode', () => {
    current = setup({ afterMs: 3000, initialIdleMs: 2000 });
    vi.advanceTimersByTime(1000);
    expect(current.dialog().hidden).toBe(false);
  });

  it('plays on after "Ja" and counts from zero', () => {
    current = setup({ afterMs: 2000 });
    vi.advanceTimersByTime(2000);
    current.dialog().querySelector('.vanta-still-watching-yes').click();
    expect(current.player.play).toHaveBeenCalled();
    expect(current.dialog().hidden).toBe(true);
    expect(current.onIdleChange).toHaveBeenLastCalledWith(0);
  });

  it('leaves the player after "Nein"', () => {
    current = setup({ afterMs: 2000 });
    vi.advanceTimersByTime(2000);
    current.dialog().querySelector('.vanta-still-watching-no').click();
    expect(current.context.onBack).toHaveBeenCalled();
  });

  it('closes like "Ja" when playback starts another way (media key, media session)', () => {
    current = setup({ afterMs: 2000 });
    vi.advanceTimersByTime(2000);
    expect(current.context.stillWatchingOpen).toBe(true);
    current.player.paused = false;
    current.player.dispatchEvent(new Event('play'));
    expect(current.dialog().hidden).toBe(true);
    expect(current.context.stillWatchingOpen).toBe(false);
    expect(current.onIdleChange).toHaveBeenLastCalledWith(0);
    expect(current.context.onBack).not.toHaveBeenCalled();
  });

  it('keeps the focus inside the dialog', () => {
    current = setup({ afterMs: 2000 });
    const outside = document.createElement('button');
    current.root.appendChild(outside);
    vi.advanceTimersByTime(2000);
    const yes = current.dialog().querySelector('.vanta-still-watching-yes');
    const no = current.dialog().querySelector('.vanta-still-watching-no');
    const tab = shiftKey => {
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
      document.activeElement.dispatchEvent(event);
      return event;
    };
    expect(tab(false).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(no);
    tab(false);
    expect(document.activeElement).toBe(yes);
    tab(true);
    expect(document.activeElement).toBe(no);

    outside.focus();
    expect(document.activeElement).toBe(yes);
  });

  it('answers "Nein" to the Back key of a TV remote', () => {
    current = setup({ afterMs: 2000, tvMode: true });
    vi.advanceTimersByTime(2000);
    const event = new KeyboardEvent('keydown', { key: 'Unidentified', bubbles: true, cancelable: true });
    Object.defineProperty(event, 'keyCode', { value: 10009 });
    document.activeElement.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(current.context.onBack).toHaveBeenCalled();
    expect(current.dialog().hidden).toBe(true);
  });

  it('never asks in a watch party or when switched off', () => {
    current = setup({ afterMs: 1000, watchParty: { enabled: true } });
    expect(current.bound).toBeNull();
    current.dispose();
    current = setup({ afterMs: 0 });
    expect(current.bound).toBeNull();
    vi.advanceTimersByTime(10_000);
    expect(current.dialog()).toBeNull();
  });
});
