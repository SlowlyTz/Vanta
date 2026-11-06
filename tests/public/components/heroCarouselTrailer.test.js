import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCarouselTrailer } from '../../../src/public/js/components/heroCarouselTrailer.js';

const desktop = () => Object.assign(Object.create(window), {
  matchMedia: (query) => ({ matches: query.includes('pointer: fine') }),
  innerWidth: 1440,
  navigator: {},
  setTimeout: window.setTimeout.bind(window),
  clearTimeout: window.clearTimeout.bind(window),
  addEventListener: window.addEventListener.bind(window),
  removeEventListener: window.removeEventListener.bind(window),
  location: window.location,
  document
});

const fromPlayer = (iframe, data) => window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data), source: iframe.contentWindow }));
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

function setup({ api } = {}) {
  const container = document.createElement('section');
  document.body.appendChild(container);
  const onDone = vi.fn();
  const trailer = createCarouselTrailer({ container, onDone, win: desktop(), api: api || { getItem: vi.fn(async () => ({ RemoteTrailers: [{ Url: 'https://youtu.be/abc' }] })) } });
  container.append(trailer.layer, trailer.soundButton);
  return { container, trailer, onDone };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('createCarouselTrailer', () => {
  it('is left out where trailers must not play', () => {
    const win = Object.assign(desktop(), { matchMedia: () => ({ matches: false }) });
    expect(createCarouselTrailer({ container: document.createElement('section'), win })).toBeNull();
  });

  it('plays the shown title once and tells the banner when it is over', async () => {
    vi.useFakeTimers();
    const { container, trailer, onDone } = setup();
    trailer.show({ Id: 'a' });
    expect(trailer.isBusy()).toBe(true);
    await vi.advanceTimersByTimeAsync(3500);
    await flush();
    const iframe = container.querySelector('iframe');
    expect(iframe.src).not.toContain('loop=');

    iframe.dispatchEvent(new Event('load'));
    fromPlayer(iframe, { event: 'onStateChange', info: 1 });
    await vi.advanceTimersByTimeAsync(1800);
    expect(container.classList.contains('is-trailer-playing')).toBe(true);
    expect(trailer.soundButton.hidden).toBe(false);

    fromPlayer(iframe, { event: 'onStateChange', info: 0 });
    expect(onDone).toHaveBeenCalledWith(true);
    expect(trailer.isBusy()).toBe(false);
    expect(container.classList.contains('is-trailer-playing')).toBe(false);
    expect(trailer.soundButton.hidden).toBe(true);
  });

  it('lets the banner go on when a title has no trailer', async () => {
    vi.useFakeTimers();
    const { trailer, onDone } = setup({ api: { getItem: vi.fn(async () => ({})) } });
    trailer.show({ Id: 'a' });
    await vi.advanceTimersByTimeAsync(3500);
    await flush();
    expect(onDone).toHaveBeenCalledWith(false);
    expect(trailer.isBusy()).toBe(false);
  });

  it('drops the trailer of a title no longer shown', async () => {
    vi.useFakeTimers();
    const getItem = vi.fn(async () => ({ RemoteTrailers: [{ Url: 'https://youtu.be/abc' }] }));
    const { container, trailer } = setup({ api: { getItem } });
    trailer.show({ Id: 'a' });
    trailer.stop();
    await vi.advanceTimersByTimeAsync(5000);
    await flush();
    expect(container.querySelector('iframe')).toBeNull();
    expect(getItem).not.toHaveBeenCalled();
  });
});
