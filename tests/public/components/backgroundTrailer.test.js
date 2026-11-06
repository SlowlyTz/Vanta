import { describe, it, expect, vi, afterEach } from 'vitest';
import { embedUrl, heroTrailerAllowed, playTrailer, playerStateOf, trailerVideoIdOf } from '../../../src/public/js/components/backgroundTrailer.js';

const desktop = (overrides = {}) => ({
  matchMedia: (query) => ({ matches: query.includes('pointer: fine') }),
  innerWidth: 1440,
  navigator: {},
  ...overrides
});

// The player's message, as YouTube posts it from its frame.
const fromPlayer = (iframe, data) => window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data), source: iframe.contentWindow }));

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  document.documentElement.className = '';
});

describe('heroTrailerAllowed', () => {
  it('allows desktops with a fine pointer only', () => {
    expect(heroTrailerAllowed({ win: desktop() })).toBe(true);
    expect(heroTrailerAllowed({ win: desktop({ matchMedia: () => ({ matches: false }) }) })).toBe(false);
    expect(heroTrailerAllowed({ win: desktop({ innerWidth: 900 }) })).toBe(false);
    expect(heroTrailerAllowed({ win: desktop({ navigator: { connection: { saveData: true } } }) })).toBe(false);
  });

  it('never plays on a TV', () => {
    document.documentElement.classList.add('tv-mode');
    expect(heroTrailerAllowed({ win: desktop() })).toBe(false);
  });
});

describe('embedUrl', () => {
  it('loops only when asked to', () => {
    expect(embedUrl('abc', 'http://x')).toContain('loop=1');
    expect(embedUrl('abc', 'http://x', { loop: false })).not.toContain('loop=');
    expect(embedUrl('abc', 'http://x', { loop: false })).toContain('mute=1');
  });
});

describe('trailerVideoIdOf', () => {
  it('prefers the remote trailers, then the links', () => {
    expect(trailerVideoIdOf({ RemoteTrailers: [{ Url: 'https://www.youtube.com/watch?v=abc' }] })).toBe('abc');
    expect(trailerVideoIdOf({ ExternalUrls: [{ Url: 'https://youtu.be/xyz' }] })).toBe('xyz');
    expect(trailerVideoIdOf({})).toBeNull();
  });
});

describe('playerStateOf', () => {
  it('reads both kinds of state messages', () => {
    expect(playerStateOf('{"event":"onStateChange","info":0}')).toBe(0);
    expect(playerStateOf({ event: 'infoDelivery', info: { playerState: 1 } })).toBe(1);
    expect(playerStateOf('nonsense')).toBeNull();
  });
});

describe('playTrailer', () => {
  const start = (options = {}) => {
    const layer = document.createElement('div');
    document.body.appendChild(layer);
    const callbacks = { onReveal: vi.fn(), onEnded: vi.fn(), onFailed: vi.fn() };
    const player = playTrailer({ layer, videoId: 'abc', loop: false, ...callbacks, ...options });
    const iframe = layer.querySelector('iframe');
    iframe.dispatchEvent(new Event('load'));
    return { layer, iframe, player, ...callbacks };
  };

  it('shows the trailer a moment after it runs and reports its end', () => {
    vi.useFakeTimers();
    const { layer, iframe, onReveal, onEnded } = start();
    fromPlayer(iframe, { event: 'onStateChange', info: 1 });
    expect(onReveal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1800);
    expect(onReveal).toHaveBeenCalledTimes(1);

    fromPlayer(iframe, { event: 'infoDelivery', info: { playerState: 0 } });
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(layer.querySelector('iframe')).toBeNull();
  });

  it('reports a video that cannot play and never shows it', () => {
    vi.useFakeTimers();
    const { iframe, onReveal, onFailed } = start();
    fromPlayer(iframe, { event: 'onError', info: 150 });
    vi.advanceTimersByTime(10_000);
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('shows the trailer anyway when the player sends no news', () => {
    vi.useFakeTimers();
    const { onReveal } = start();
    vi.advanceTimersByTime(4000);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('ignores messages from other frames', () => {
    vi.useFakeTimers();
    const { onEnded } = start();
    window.dispatchEvent(new MessageEvent('message', { data: '{"event":"onStateChange","info":0}', source: window }));
    expect(onEnded).not.toHaveBeenCalled();
  });
});
