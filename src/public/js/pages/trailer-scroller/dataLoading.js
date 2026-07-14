import { MediaApi } from '../../api/media.api.js';
import { appStore } from '../../store/app.store.js';
import { mergeTrailerPage, markTrailerFavorite } from '../trailer-scroller.state.js';

const LOAD_LIMIT = 8;

export function bindDataLoading(ctx) {
  ctx.navigateRelative = async direction => {
    if (ctx.state.trailers.length === 0 || ctx.state.loading) return;

    const targetIndex = ctx.state.activeIndex + direction;
    if (targetIndex < 0) return;

    if (targetIndex >= ctx.state.trailers.length) {
      if (!ctx.state.hasMore) return;

      const previousLength = ctx.state.trailers.length;
      await ctx.loadTrailers(false, { activateFirst: false });
      if (ctx.state.trailers.length > previousLength) {
        ctx.setActive(previousLength);
      }
      return;
    }

    ctx.setActive(targetIndex);
  };

  ctx.loadTrailers = async (refresh = false, { activateFirst = true, targetTrailerId = null } = {}) => {
    if (ctx.state.loading || (!ctx.state.hasMore && !refresh)) return;

    ctx.state = { ...ctx.state, loading: true };
    ctx.lastLoadFailed = false;
    ctx.updateChrome();
    ctx.showLoadingState();

    try {
      const page = await MediaApi.getTrailers(
        refresh ? null : ctx.state.cursor,
        LOAD_LIMIT,
        refresh,
        targetTrailerId
      );
      ctx.state = mergeTrailerPage(ctx.state, page);
      ctx.lastLoadFailed = false;
      ctx.renderSlides();

      if (refresh) {
        if (ctx.intersectionObserver) ctx.intersectionObserver.disconnect();
        ctx.playerManager.destroyAll();
        ctx.track.innerHTML = '';
        ctx.state = { ...ctx.state, trailers: [], seenIds: new Set() };
        ctx.state = mergeTrailerPage(ctx.state, page);
        ctx.renderSlides();
        ctx.setActive(0);
      } else if (activateFirst && ctx.state.trailers.length > 0 && ctx.state.activeIndex === 0 && !ctx.state.introOpen) {
        ctx.setActive(0);
      }
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
