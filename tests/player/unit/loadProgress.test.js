import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLoadProgressTracker, formatLoadProgress, measureLoad, partialFragmentSeconds } from '../../../src/player/src/loadProgress.js';
import { createPlayerMarkup } from '../../../src/player/src/player/markup.js';
import { bindLoadIndicator } from '../../../src/player/src/player/loadIndicator.js';

const fragment = (loaded, total, { start = 60, duration = 6 } = {}) => ({ start, duration, type: 'main', stats: { loaded, total } });

describe('measureLoad', () => {
  it('zählt Puffer und den Anteil des ladenden Segments gegen das Ziel', () => {
    expect(partialFragmentSeconds(fragment(500, 1000), 60)).toBe(3);
    expect(partialFragmentSeconds(fragment(500, 0), 60)).toBe(0);
    expect(partialFragmentSeconds(fragment(500, 1000, { start: 0 }), 60)).toBe(0);
    expect(measureLoad({ bufferedAhead: 1, fragment: fragment(250, 1000), position: 60 })).toEqual({ fraction: 0.625, loadedSeconds: 2.5, phase: 'loading' });
    expect(measureLoad({ bufferedAhead: 6, position: 60 }).phase).toBe('done');
    expect(measureLoad({ bufferedAhead: 0.3, position: 99.5, duration: 100 }).fraction).toBe(1);
  });

  it('erfindet vor dem ersten Byte keine Zahl', () => {
    const measured = measureLoad({ bufferedAhead: 0, fragment: fragment(0, 0), position: 60 });
    expect(measured.phase).toBe('preparing');
    expect(formatLoadProgress({ ...measured, etaSeconds: null })).toBe('Server bereitet Stream vor …');
  });
});

describe('createLoadProgressTracker', () => {
  it('schätzt die Restzeit aus der Ladegeschwindigkeit, erst nach einem kurzen Messfenster', () => {
    let now = 0;
    const tracker = createLoadProgressTracker({ now: () => now });
    expect(tracker.update({ bufferedAhead: 0, fragment: fragment(100, 1000), position: 60 }).etaSeconds).toBeNull();
    now = 400;
    expect(tracker.update({ bufferedAhead: 0, fragment: fragment(300, 1000), position: 60 }).etaSeconds).toBeNull();
    now = 1000;
    // 0.6 s → 1.2 s Video geladen: 2 s Video pro Sekunde, 2.2 s fehlen noch
    const progress = tracker.update({ bufferedAhead: 0, fragment: fragment(300, 1000), position: 60 });
    now = 1500;
    const later = tracker.update({ bufferedAhead: 0, fragment: fragment(600, 1000), position: 60 });
    expect(later.loadedSeconds).toBeCloseTo(3.6);
    expect(later.etaSeconds).toBe(1);
    expect(formatLoadProgress(later)).toBe('90 % · noch ca. 1 s');
    expect(progress.phase).toBe('loading');
  });
});

describe('bindLoadIndicator', () => {
  let root;
  afterEach(() => {
    vi.useRealTimers();
    root?.remove();
  });

  it('zeigt Prozent im Lade-Cover und im Spinner, vor dem ersten Byte „Server bereitet vor“', () => {
    vi.useFakeTimers();
    root = document.createElement('div');
    document.body.appendChild(root);
    const dom = createPlayerMarkup(root, { title: 'T', subtitle: '', poster: '' });
    let buffered = 0;
    const context = {
      dom,
      player: dom.player,
      disposers: [],
      listen: (target, event, handler) => target.addEventListener(event, handler),
      getBufferedAhead: () => buffered
    };
    Object.defineProperty(dom.player, 'currentTime', { value: 60, configurable: true });
    bindLoadIndicator(context);

    context.loadIndicator.setCoverVisible(true);
    expect(dom.loadingProgress.hidden).toBe(false);
    expect(dom.loadingProgressText.textContent).toBe('Server bereitet Stream vor …');

    const frag = fragment(0, 2000);
    dom.player.dispatchEvent(new CustomEvent('hls-frag-loading', { detail: { frag } }));
    frag.stats.loaded = 1000;
    vi.advanceTimersByTime(250);
    expect(dom.loadingProgressText.textContent).toMatch(/^75 %/);
    expect(dom.loadingProgressBar.style.transform).toBe('scaleX(0.75)');

    context.loadIndicator.setCoverVisible(false);
    context.loadIndicator.setInlineVisible(true);
    context.loadIndicator.setSlow(true);
    expect(dom.inlineLabel.hidden).toBe(false);
    expect(dom.inlineLabel.textContent).toMatch(/^Lädt länger als üblich … · 75 %/);

    buffered = 5;
    dom.player.dispatchEvent(new CustomEvent('hls-frag-loaded', { detail: { frag } }));
    vi.advanceTimersByTime(250);
    expect(dom.inlineLabel.textContent).toBe('Lädt länger als üblich …');

    expect(context.getLoadProgress(60).fraction).toBe(1);
  });

  it('zählt beim Quellenwechsel den alten Puffer nicht mit', () => {
    vi.useFakeTimers();
    root = document.createElement('div');
    document.body.appendChild(root);
    const dom = createPlayerMarkup(root, { title: 'T', subtitle: '', poster: '' });
    const context = {
      dom,
      player: dom.player,
      disposers: [],
      listen: (target, event, handler) => target.addEventListener(event, handler),
      getBufferedAhead: () => 20,
      sourceSwitch: { getCurrentPlayback: () => ({ playSessionId: 'old' }) }
    };
    bindLoadIndicator(context);

    context.loadIndicator.setCoverVisible(true);
    expect(dom.loadingProgressText.textContent).toBe('Server bereitet Stream vor …');
    dom.player.dispatchEvent(new CustomEvent('source-change'));
    vi.advanceTimersByTime(250);
    expect(dom.loadingProgress.hidden).toBe(true);
  });
});
