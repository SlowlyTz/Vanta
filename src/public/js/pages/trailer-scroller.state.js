export const DEFAULT_LIMIT = 8;
export const LOAD_THRESHOLD = 3;
export const INTRO_SEEN_KEY = 'vantaTrailerScrollerIntroSeen';

export function createInitialState() {
  return {
    trailers: [],
    activeIndex: 0,
    cursor: null,
    hasMore: true,
    loading: false,
    introOpen: !hasIntroBeenSeen(),
    seenIds: new Set()
  };
}

export function hasIntroBeenSeen() {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markIntroAsSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch {
    // ignore
  }
}

export function mergeTrailerPage(state, page) {
  const newTrailers = (page.items || []).filter((trailer) => {
    if (!trailer || !trailer.id) return false;
    return !state.seenIds.has(trailer.id);
  });

  const updatedSeenIds = new Set(state.seenIds);
  newTrailers.forEach((trailer) => updatedSeenIds.add(trailer.id));

  return {
    ...state,
    trailers: [...state.trailers, ...newTrailers],
    seenIds: updatedSeenIds,
    cursor: page.nextCursor,
    hasMore: Boolean(page.hasMore),
    loading: false
  };
}

export function markTrailerFavorite(state, itemId, isFavorite) {
  const trailers = state.trailers.map((trailer) => {
    if (trailer.itemId === itemId) {
      return { ...trailer, isFavorite };
    }
    return trailer;
  });
  return { ...state, trailers };
}

export function shouldLoadMore(state) {
  if (state.loading || !state.hasMore) return false;
  return state.activeIndex >= state.trailers.length - LOAD_THRESHOLD;
}

export function clampIndex(index, length) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

export function setActiveIndex(state, index) {
  return {
    ...state,
    activeIndex: clampIndex(index, state.trailers.length)
  };
}

export function goToNextTrailer(state) {
  return setActiveIndex(state, state.activeIndex + 1);
}

export function goToPreviousTrailer(state) {
  return setActiveIndex(state, state.activeIndex - 1);
}

export function getVisibleRange(activeIndex, totalCount, buffer = 2) {
  if (totalCount <= 0) return { start: 0, end: 0 };
  const start = Math.max(0, activeIndex - buffer);
  const end = Math.min(totalCount, activeIndex + buffer + 1);
  return { start, end };
}
