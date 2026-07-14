import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createInitialState,
  mergeTrailerPage,
  markTrailerFavorite,
  shouldLoadMore,
  clampIndex,
  setActiveIndex,
  goToNextTrailer,
  goToPreviousTrailer,
  getVisibleRange,
  hasIntroBeenSeen,
  markIntroAsSeen,
  INTRO_SEEN_KEY
} from '../../../src/public/js/pages/trailer-scroller.state.js';

function createTrailer(id, overrides = {}) {
  return {
    id,
    itemId: `item-${id}`,
    itemType: 'Movie',
    title: `Trailer ${id}`,
    overview: 'Overview',
    year: 2024,
    youtubeVideoId: `youtube-${id}`,
    youtubeUrl: `https://youtu.be/youtube-${id}`,
    isFavorite: false,
    ...overrides
  };
}

describe('createInitialState', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn()
    });
  });

  it('starts with intro open when not seen before', () => {
    const state = createInitialState();
    expect(state.introOpen).toBe(true);
    expect(state.trailers).toEqual([]);
    expect(state.loading).toBe(false);
    expect(state.hasMore).toBe(true);
    expect(state.seenIds).toBeInstanceOf(Set);
  });

  it('starts with intro closed when already seen', () => {
    sessionStorage.getItem.mockReturnValue('true');
    const state = createInitialState();
    expect(state.introOpen).toBe(false);
  });
});

describe('mergeTrailerPage', () => {
  it('appends new trailers and updates cursor info', () => {
    let state = createInitialState();
    state = mergeTrailerPage(state, {
      items: [createTrailer('1'), createTrailer('2')],
      nextCursor: '2',
      hasMore: true
    });

    expect(state.trailers).toHaveLength(2);
    expect(state.cursor).toBe('2');
    expect(state.hasMore).toBe(true);
    expect(state.loading).toBe(false);
    expect(state.seenIds.has('1')).toBe(true);
    expect(state.seenIds.has('2')).toBe(true);
  });

  it('filters duplicate trailers by id', () => {
    let state = createInitialState();
    state = mergeTrailerPage(state, {
      items: [createTrailer('1'), createTrailer('2')],
      nextCursor: '2',
      hasMore: true
    });

    state = mergeTrailerPage(state, {
      items: [createTrailer('2'), createTrailer('3')],
      nextCursor: '3',
      hasMore: true
    });

    expect(state.trailers).toHaveLength(3);
    expect(state.trailers.map((t) => t.id)).toEqual(['1', '2', '3']);
  });

  it('skips invalid trailer entries', () => {
    let state = createInitialState();
    state = mergeTrailerPage(state, {
      items: [createTrailer('1'), null, { itemId: 'x' }, createTrailer('2')],
      nextCursor: '2',
      hasMore: false
    });

    expect(state.trailers).toHaveLength(2);
    expect(state.hasMore).toBe(false);
  });
});

describe('markTrailerFavorite', () => {
  it('updates isFavorite for all trailers with matching itemId', () => {
    let state = createInitialState();
    state = mergeTrailerPage(state, {
      items: [createTrailer('1', { itemId: 'abc' }), createTrailer('2', { itemId: 'def' })],
      nextCursor: '2',
      hasMore: false
    });

    state = markTrailerFavorite(state, 'abc', true);

    expect(state.trailers[0].isFavorite).toBe(true);
    expect(state.trailers[1].isFavorite).toBe(false);
  });
});

describe('shouldLoadMore', () => {
  it('returns true when active index reaches threshold before end', () => {
    let state = createInitialState();
    state = mergeTrailerPage(state, {
      items: Array.from({ length: 10 }, (_, i) => createTrailer(String(i))),
      nextCursor: '10',
      hasMore: true
    });

    state = setActiveIndex(state, 7);
    expect(shouldLoadMore(state)).toBe(true);
  });

  it('returns false when no more items', () => {
    let state = createInitialState();
    state = mergeTrailerPage(state, {
      items: Array.from({ length: 10 }, (_, i) => createTrailer(String(i))),
      nextCursor: null,
      hasMore: false
    });

    state = setActiveIndex(state, 9);
    expect(shouldLoadMore(state)).toBe(false);
  });

  it('returns false when already loading', () => {
    let state = createInitialState();
    state = mergeTrailerPage(state, {
      items: Array.from({ length: 10 }, (_, i) => createTrailer(String(i))),
      nextCursor: '10',
      hasMore: true
    });

    state = setActiveIndex(state, 7);
    state = { ...state, loading: true };
    expect(shouldLoadMore(state)).toBe(false);
  });
});

describe('clampIndex', () => {
  it('clamps to valid range', () => {
    expect(clampIndex(-1, 5)).toBe(0);
    expect(clampIndex(0, 5)).toBe(0);
    expect(clampIndex(4, 5)).toBe(4);
    expect(clampIndex(10, 5)).toBe(4);
    expect(clampIndex(0, 0)).toBe(0);
  });
});

describe('setActiveIndex', () => {
  it('updates active index within bounds', () => {
    let state = createInitialState();
    state = mergeTrailerPage(state, {
      items: [createTrailer('1'), createTrailer('2')],
      nextCursor: '2',
      hasMore: false
    });

    state = setActiveIndex(state, 5);
    expect(state.activeIndex).toBe(1);
  });
});

describe('goToNextTrailer / goToPreviousTrailer', () => {
  it('moves to next and previous trailer', () => {
    let state = createInitialState();
    state = mergeTrailerPage(state, {
      items: [createTrailer('1'), createTrailer('2'), createTrailer('3')],
      nextCursor: null,
      hasMore: false
    });
    state = setActiveIndex(state, 1);

    state = goToNextTrailer(state);
    expect(state.activeIndex).toBe(2);

    state = goToPreviousTrailer(state);
    expect(state.activeIndex).toBe(1);
  });
});

describe('getVisibleRange', () => {
  it('returns range around active index with buffer', () => {
    expect(getVisibleRange(5, 10, 2)).toEqual({ start: 3, end: 8 });
  });

  it('clamps to bounds', () => {
    expect(getVisibleRange(0, 10, 2)).toEqual({ start: 0, end: 3 });
    expect(getVisibleRange(9, 10, 2)).toEqual({ start: 7, end: 10 });
  });
});

describe('intro session storage', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn()
    });
  });

  it('checks intro seen status from sessionStorage', () => {
    expect(hasIntroBeenSeen()).toBe(false);
    sessionStorage.getItem.mockReturnValue('true');
    expect(hasIntroBeenSeen()).toBe(true);
    expect(sessionStorage.getItem).toHaveBeenCalledWith(INTRO_SEEN_KEY);
  });

  it('marks intro as seen in sessionStorage', () => {
    markIntroAsSeen();
    expect(sessionStorage.setItem).toHaveBeenCalledWith(INTRO_SEEN_KEY, 'true');
  });
});
