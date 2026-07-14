import { setActiveIndex, getVisibleRange, shouldLoadMore } from '../trailer-scroller.state.js';

const PLAYER_BUFFER = 2;

export function bindPlayback(ctx) {
  ctx.syncPlayers = async () => {
    if (ctx.isDestroyed) return;
    const runId = ++ctx.syncPlayersRunId;

    if (ctx.syncPlayersTimeout) {
      clearTimeout(ctx.syncPlayersTimeout);
    }

    ctx.syncPlayersTimeout = setTimeout(async () => {
      if (ctx.isDestroyed || runId !== ctx.syncPlayersRunId) return;

      const { start, end } = getVisibleRange(ctx.state.activeIndex, ctx.state.trailers.length, PLAYER_BUFFER);
      const visibleIds = new Set();

      for (let i = start; i < end; i++) {
        const trailer = ctx.state.trailers[i];
        if (!trailer) continue;
        const containerId = ctx.getContainerId(i);
        visibleIds.add(containerId);

        const slide = ctx.track.children[i];
        if (!slide) continue;

        if (slide.classList.contains('has-player-error')) continue;

        const isActive = i === ctx.state.activeIndex;
        const existingPlayer = ctx.playerManager.players.get(containerId);

        if (existingPlayer) {
          ctx.setPlayerStatus(slide, 'ready');
          if (isActive) ctx.playerManager.play(containerId);
          else ctx.playerManager.pause(containerId);
          continue;
        }

        ctx.setPlayerStatus(slide, 'loading');
        try {
          await ctx.playerManager.createPlayer(containerId, trailer.youtubeVideoId, {
            autoplay: isActive ? 1 : 0,
            muted: false,
            onReady: () => {
              if (ctx.isDestroyed || runId !== ctx.syncPlayersRunId) return;
              ctx.setPlayerStatus(slide, 'ready');
              if (isActive) {
                ctx.playerManager.play(containerId);
              } else {
                ctx.playerManager.pause(containerId);
              }
            },
            onError: () => {
              ctx.setPlayerStatus(slide, 'error');
            }
          });
        } catch (error) {
          console.error('[Trailer YouTube Player Error]', error);
          ctx.setPlayerStatus(slide, 'error');
        }

        if (ctx.isDestroyed || runId !== ctx.syncPlayersRunId) return;
      }

      for (const [containerId] of ctx.playerManager.players) {
        if (!visibleIds.has(containerId)) {
          ctx.playerManager.destroy(containerId);
        }
      }

      for (let i = 0; i < ctx.state.trailers.length; i++) {
        if (i >= start && i < end) continue;
        const slide = ctx.track.children[i];
        if (!slide) continue;
        ctx.setPlayerStatus(slide, 'loading');
      }
    }, 100);
  };

  ctx.resyncActivePlayer = () => {
    if (ctx.isDestroyed || ctx.state.introOpen || ctx.state.trailers.length === 0) return;
    ctx.syncPlayers();
  };

  ctx.scheduleActivePlayerResync = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(ctx.resyncActivePlayer);
    });
  };

  ctx.scrollToSlide = (slide, behavior) => {
    if (!slide) return;

    ctx.suppressIntersectionUpdates = true;
    if (ctx.navigationUnlockTimeout) clearTimeout(ctx.navigationUnlockTimeout);

    if (typeof ctx.track.scrollTo === 'function') {
      ctx.track.scrollTo({ top: slide.offsetTop, behavior });
    } else {
      ctx.track.scrollTop = slide.offsetTop;
    }

    ctx.navigationUnlockTimeout = setTimeout(() => {
      ctx.suppressIntersectionUpdates = false;
      ctx.navigationUnlockTimeout = null;
    }, behavior === 'smooth' ? 450 : 0);
  };

  ctx.setActive = (index, { behavior = 'smooth', scroll = true } = {}) => {
    ctx.state = setActiveIndex(ctx.state, index);
    ctx.updateActiveClasses();
    ctx.updateChrome();
    const activeTrailer = ctx.state.trailers[ctx.state.activeIndex];
    ctx.updateTrailerHash(activeTrailer);

    const slide = ctx.track.children[ctx.state.activeIndex];
    if (scroll) ctx.scrollToSlide(slide, behavior);

    ctx.syncPlayers();

    if (shouldLoadMore(ctx.state)) {
      ctx.loadTrailers();
    }
  };

  ctx.handleVisibilityChange = () => {
    if (!document.hidden) ctx.resyncActivePlayer();
  };

  return ctx;
}
