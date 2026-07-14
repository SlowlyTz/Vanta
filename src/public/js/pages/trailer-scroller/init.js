import { createIntroModal } from './intro.js';
import { appStore } from '../../store/app.store.js';

function waitForConnected(ctx) {
  if (ctx.container.isConnected) return Promise.resolve();

  return new Promise(resolve => {
    const check = () => {
      if (ctx.isDestroyed) {
        resolve();
        return;
      }
      if (ctx.container.isConnected) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

export function bindInit(ctx) {
  ctx.init = async () => {
    await waitForConnected(ctx);
    if (ctx.isDestroyed) return;
    ctx.viewportLock.lock();

    const initialTrailerId = ctx.getInitialTrailerId();
    const initialTrailerData = initialTrailerId ? ctx.consumeReturnTrailerData(initialTrailerId) : null;
    if (initialTrailerId) {
      ctx.state = { ...ctx.state, introOpen: false };
    }

    if (initialTrailerData) {
      ctx.state = {
        ...ctx.state,
        trailers: [initialTrailerData],
        seenIds: new Set([initialTrailerData.id])
      };
      ctx.renderSlides();
    }

    await ctx.loadTrailers(false, { activateFirst: !initialTrailerId, targetTrailerId: initialTrailerId });
    if (ctx.isDestroyed) return;

    let initialIndex = 0;
    if (initialTrailerId) {
      initialIndex = await ctx.loadUntilTrailerFound(initialTrailerId);
      if (initialIndex === -1) {
        initialIndex = 0;
        appStore.showToast('Geteilter Trailer ist nicht mehr verfügbar', 'error');
      }
    }

    if (ctx.state.trailers.length === 0) {
      if (!ctx.lastLoadFailed) ctx.showEmptyState();
      return;
    }

    const slides = Array.from(ctx.track.children);
    slides.forEach(slide => ctx.intersectionObserver.observe(slide));

    if (ctx.state.introOpen) {
      const intro = createIntroModal({
        onStart: () => {
          ctx.state = { ...ctx.state, introOpen: false };
          ctx.setActive(initialIndex, { behavior: 'auto' });
          ctx.scheduleActivePlayerResync();
          requestAnimationFrame(() => {
            ctx.suppressIntersectionUpdates = false;
          });
        }
      });
      ctx.container.appendChild(intro.element);
    } else {
      ctx.setActive(initialIndex, { behavior: 'auto' });
      ctx.scheduleActivePlayerResync();
      requestAnimationFrame(() => {
        ctx.suppressIntersectionUpdates = false;
      });
    }
  };

  return ctx;
}
