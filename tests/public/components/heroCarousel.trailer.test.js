import { describe, it, expect, vi, afterEach } from 'vitest';

// A stand-in trailer the test drives: busy while "playing", done on demand.
const fake = { busy: false, onDone: null, shown: [], stopped: 0 };
vi.mock('../../../src/public/js/components/heroCarouselTrailer.js', () => ({
  createCarouselTrailer: ({ onDone }) => {
    fake.onDone = onDone;
    return {
      layer: document.createElement('div'),
      soundButton: document.createElement('button'),
      show: (item) => { fake.shown.push(item.Id); fake.busy = true; },
      stop: () => { fake.stopped += 1; fake.busy = false; },
      destroy: () => {},
      isBusy: () => fake.busy
    };
  }
}));

const { HeroCarousel } = await import('../../../src/public/js/components/heroCarousel.js');

const items = ['a', 'b', 'c'].map(Id => ({ Id, Name: Id, Type: 'Movie' }));
const activeId = (el) => el.querySelector('.hero-slide-content.active').dataset.itemId;

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  Object.assign(fake, { busy: false, onDone: null, shown: [], stopped: 0 });
});

describe('HeroCarousel with trailers', () => {
  it('waits for the trailer and moves on shortly after it ends', () => {
    vi.useFakeTimers();
    const el = HeroCarousel({ items });
    document.body.appendChild(el);
    expect(fake.shown).toEqual(['a']);

    vi.advanceTimersByTime(20_000);
    expect(activeId(el)).toBe('a');

    fake.busy = false;
    fake.onDone(true);
    vi.advanceTimersByTime(2500);
    expect(activeId(el)).toBe('b');
    expect(fake.shown).toEqual(['a', 'b']);
  });

  it('keeps the usual pace for a title without a trailer', () => {
    vi.useFakeTimers();
    const el = HeroCarousel({ items });
    document.body.appendChild(el);
    vi.advanceTimersByTime(4000);
    fake.busy = false;
    fake.onDone(false);
    vi.advanceTimersByTime(4000);
    expect(activeId(el)).toBe('b');
  });

  it('stops the trailer with the pause button', () => {
    const el = HeroCarousel({ items });
    document.body.appendChild(el);
    el.querySelector('.hero-carousel-pause').click();
    expect(fake.stopped).toBe(1);
    el.querySelector('.hero-carousel-pause').click();
    expect(fake.shown).toEqual(['a', 'a']);
  });
});
