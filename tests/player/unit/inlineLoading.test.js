import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createInlineLoadingWatch, isPlaybackReady, SLOW_AFTER_MS } from '../../../src/player/src/player/inlineLoading.js';

const video = overrides => ({ seeking: false, paused: false, readyState: 4, currentTime: 60, duration: 1200, ...overrides });

describe('isPlaybackReady', () => {
  it('verlangt beim Abspielen Puffer, genug Daten und laufende Zeit', () => {
    expect(isPlaybackReady({ element: video({ seeking: true }), bufferedAhead: 5, anchorTime: 50 })).toBe(false);
    expect(isPlaybackReady({ element: video({ readyState: 2 }), bufferedAhead: 5, anchorTime: 50 })).toBe(false);
    expect(isPlaybackReady({ element: video(), bufferedAhead: 0.4, anchorTime: 50 })).toBe(false);
    expect(isPlaybackReady({ element: video({ currentTime: 60 }), bufferedAhead: 5, anchorTime: 60 })).toBe(false);
    expect(isPlaybackReady({ element: video({ currentTime: 60.2 }), bufferedAhead: 5, anchorTime: 60 })).toBe(true);
    expect(isPlaybackReady({ element: video({ currentTime: 1199.8 }), bufferedAhead: 0, anchorTime: 1199 })).toBe(true);
  });

  it('braucht pausiert nur das Bild an der Zielstelle', () => {
    expect(isPlaybackReady({ element: video({ paused: true, readyState: 1 }) })).toBe(false);
    expect(isPlaybackReady({ element: video({ paused: true, readyState: 2 }) })).toBe(true);
  });
});

describe('createInlineLoadingWatch', () => {
  let element;
  let buffered;
  let setVisible;
  let setSlow;
  let watch;

  beforeEach(() => {
    vi.useFakeTimers();
    element = video({ seeking: true, currentTime: 70, readyState: 1 });
    buffered = 0;
    setVisible = vi.fn();
    setSlow = vi.fn();
    watch = createInlineLoadingWatch({ getVideo: () => element, getBufferedAhead: () => buffered, setVisible, setSlow });
  });
  afterEach(() => {
    watch.end();
    vi.useRealTimers();
  });

  it('bleibt nach „seeked“ sichtbar, bis das Video wirklich weiterläuft', () => {
    watch.begin();
    expect(setVisible).toHaveBeenLastCalledWith(true);

    // seeked: ein Bild ist da, aber kaum Puffer
    element = video({ currentTime: 70, readyState: 2 });
    watch.check();
    vi.advanceTimersByTime(300);
    expect(setVisible).not.toHaveBeenCalledWith(false);

    element = video({ currentTime: 70, readyState: 4 });
    buffered = 3;
    vi.advanceTimersByTime(200);
    expect(setVisible).not.toHaveBeenCalledWith(false);

    element = video({ currentTime: 70.3, readyState: 4 });
    vi.advanceTimersByTime(100);
    expect(setVisible).toHaveBeenLastCalledWith(false);
    expect(watch.isActive()).toBe(false);
  });

  it('verschwindet nach 6 s nicht, sondern sagt, dass es länger dauert', () => {
    watch.begin();
    vi.advanceTimersByTime(SLOW_AFTER_MS + 100);
    expect(setSlow).toHaveBeenCalledWith(true);
    expect(setVisible).not.toHaveBeenCalledWith(false);

    element = video({ paused: true, readyState: 2 });
    vi.advanceTimersByTime(100);
    expect(setVisible).toHaveBeenLastCalledWith(false);
    expect(setSlow).toHaveBeenLastCalledWith(false);
  });

  it('überlässt einer Quellenumschaltung das Feld', () => {
    let switching = false;
    watch = createInlineLoadingWatch({ getVideo: () => element, getBufferedAhead: () => 0, isSwitching: () => switching, setVisible, setSlow });
    watch.begin();
    switching = true;
    vi.advanceTimersByTime(100);
    expect(watch.isActive()).toBe(false);
  });
});
