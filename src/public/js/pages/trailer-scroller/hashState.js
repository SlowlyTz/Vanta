const TRAILER_QUERY_PARAM = 'trailer';
const RETURN_TRAILER_KEY = 'vantaTrailerScrollerReturnTrailerId';
const RETURN_TRAILER_DATA_KEY = 'vantaTrailerScrollerReturnTrailerData';

export function bindHashState(ctx) {
  ctx.getHashParams = () => {
    const [, query = ''] = (window.location.hash || '').split('?');
    return new URLSearchParams(query);
  };

  ctx.getTrailerIdFromHash = () => ctx.getHashParams().get(TRAILER_QUERY_PARAM);

  ctx.getInitialTrailerId = () => {
    const hashTrailerId = ctx.getTrailerIdFromHash();
    let returnTrailerId = null;

    try {
      returnTrailerId = sessionStorage.getItem(RETURN_TRAILER_KEY);
      sessionStorage.removeItem(RETURN_TRAILER_KEY);
    } catch {
      // ignore
    }

    return hashTrailerId || returnTrailerId;
  };

  ctx.consumeReturnTrailerData = expectedTrailerId => {
    try {
      const raw = sessionStorage.getItem(RETURN_TRAILER_DATA_KEY);
      sessionStorage.removeItem(RETURN_TRAILER_DATA_KEY);
      if (!raw) return null;

      const trailer = JSON.parse(raw);
      if (!trailer || !trailer.id || trailer.id !== expectedTrailerId) return null;
      return trailer;
    } catch {
      return null;
    }
  };

  ctx.getTrailerHash = trailer => `#/scroller?${TRAILER_QUERY_PARAM}=${encodeURIComponent(trailer.id)}`;

  ctx.getTrailerShareUrl = trailer => {
    const url = new URL(window.location.href);
    url.hash = ctx.getTrailerHash(trailer);
    return url.toString();
  };

  ctx.getDetailHash = trailer => `#/item/${trailer.itemId}?returnTo=${encodeURIComponent(ctx.getTrailerHash(trailer))}`;

  ctx.setCurrentHashWithoutNavigation = hash => {
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}${hash}`
    );
  };

  ctx.rememberReturnTrailer = trailer => {
    if (!trailer) return;

    try {
      sessionStorage.setItem(RETURN_TRAILER_KEY, trailer.id);
      sessionStorage.setItem(RETURN_TRAILER_DATA_KEY, JSON.stringify(trailer));
    } catch {
      // ignore
    }
  };

  ctx.navigateToDetail = trailer => {
    if (!trailer) return;

    ctx.rememberReturnTrailer(trailer);
    ctx.setCurrentHashWithoutNavigation(ctx.getTrailerHash(trailer));
    window.location.hash = ctx.getDetailHash(trailer);
  };

  ctx.updateTrailerHash = trailer => {
    if (!trailer || !window.location.hash.startsWith('#/scroller')) return;

    const nextHash = ctx.getTrailerHash(trailer);
    if (window.location.hash === nextHash) return;

    ctx.setCurrentHashWithoutNavigation(nextHash);
  };

  ctx.findTrailerIndex = trailerId => {
    if (!trailerId) return -1;
    return ctx.state.trailers.findIndex(trailer => trailer.id === trailerId);
  };

  ctx.handleHashChange = () => {
    if (!window.location.hash.startsWith('#/scroller')) {
      ctx.cleanup();
    }
  };

  return ctx;
}
