import { MediaApi } from '../../api/media.api.js';
import { appStore } from '../../store/app.store.js';
import { mergeTrailerPage, markTrailerFavorite } from '../trailer-scroller.state.js';
import { getFeedId, setFeedId } from './feedSession.js';

const LOAD_LIMIT = 8;
const EMPTY_PAGE_RETRIES = 3;

export function bindDataLoading(ctx) {
  ctx.navigateRelative = async direction => {
    if (ctx.state.trailers.length === 0 || ctx.state.loading) return;

    const targetIndex = ctx.state.activeIndex + direction;
    if (targetIndex < 0) return;

    if (targetIndex >= ctx.state.trailers.length) {
      const previousLength = ctx.state.trailers.length;

      // A page can consist entirely of trailers we already hold, which would silently leave the
      // feed standing still. Keep pulling until something new shows up.
      for (let attempt = 0; attempt < EMPTY_PAGE_RETRIES; attempt++) {
        if (!ctx.state.hasMore || ctx.isDestroyed) break;
        await ctx.loadTrailers(false, { activateFirst: false });
        if (ctx.state.trailers.length > previousLength) {
          ctx.setActive(previousLength);
          return;
        }
      }
      return;
    }

    ctx.setActive(targetIndex);
  };

  ctx.resetFeed = () => {
    if (ctx.intersectionObserver) ctx.intersectionObserver.disconnect();
    ctx.playerManager.destroyAll();
    ctx.track.replaceChildren();
    ctx.state = { ...ctx.state, trailers: [], seenIds: new Set(), activeIndex: 0, cursor: null };
  };

  ctx.loadTrailers = async (refresh = false, { activateFirst = true, targetTrailerId = null } = {}) => {
    if (ctx.state.loading || (!ctx.state.hasMore && !refresh)) return;

    const requestedFeedId = refresh ? null : getFeedId();

    ctx.state = { ...ctx.state, loading: true };
    ctx.lastLoadFailed = false;
    ctx.updateChrome();
    ctx.showLoadingState();

    try {
      const page = await MediaApi.getTrailers({
        feedId: requestedFeedId,
        cursor: refresh ? null : ctx.state.cursor,
        limit: LOAD_LIMIT,
        target: targetTrailerId
      });

      // A different feed id means the server shuffled anew — anything we already hold belongs to
      // the previous feed and has to go.
      const startedNewFeed = page.feedId !== requestedFeedId;
      setFeedId(page.feedId);

      if (startedNewFeed) ctx.resetFeed();

      ctx.state = mergeTrailerPage(ctx.state, page);
      ctx.lastLoadFailed = false;
      ctx.renderSlides();

      const shouldActivateFirst = (startedNewFeed || activateFirst)
        && ctx.state.trailers.length > 0
        && ctx.state.activeIndex === 0
        && !ctx.state.introOpen;

      if (shouldActivateFirst) ctx.setActive(0);
    } catch (error) {
      if (error.isAuthError) {
        ctx.state = { ...ctx.state, loading: false };
        ctx.lastLoadFailed = true;
        return;
      }
      console.error('[Trailer Scroller Load Error]', error);
      appStore.showToast('Fehler beim Laden der Trailer', 'error');
      ctx.state = { ...ctx.state, loading: false };
      ctx.lastLoadFailed = true;
      if (ctx.state.trailers.length === 0) ctx.showErrorState(error);
    } finally {
      ctx.updateChrome();
    }
  };

  ctx.loadUntilTrailerFound = async trailerId => {
    if (!trailerId) return -1;

    let index = ctx.findTrailerIndex(trailerId);
    while (index === -1 && ctx.state.hasMore && !ctx.isDestroyed) {
      await ctx.loadTrailers(false, { activateFirst: false });
      index = ctx.findTrailerIndex(trailerId);
    }

    return index;
  };

  ctx.toggleFavorite = async itemId => {
    const currentTrailer = ctx.state.trailers.find(trailer => trailer.itemId === itemId);
    if (!currentTrailer) return;

    const nextIsFavorite = !currentTrailer.isFavorite;
    ctx.state = markTrailerFavorite(ctx.state, itemId, nextIsFavorite);
    ctx.renderSlides();

    try {
      if (nextIsFavorite) {
        await MediaApi.favoriteItem(itemId);
      } else {
        await MediaApi.unfavoriteItem(itemId);
      }
    } catch (error) {
      if (error.isAuthError) return;
      console.error('[Trailer Favorite Error]', error);
      appStore.showToast('Favorit konnte nicht aktualisiert werden', 'error');
      ctx.state = markTrailerFavorite(ctx.state, itemId, currentTrailer.isFavorite);
      ctx.renderSlides();
    }
  };

  ctx.toggleOverview = itemId => {
    if (ctx.expandedOverviewIds.has(itemId)) {
      ctx.expandedOverviewIds.delete(itemId);
    } else {
      ctx.expandedOverviewIds.add(itemId);
    }
    ctx.renderSlides();
  };

  return ctx;
}
