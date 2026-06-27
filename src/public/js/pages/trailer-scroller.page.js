import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { createIntroModal } from './trailer-scroller/intro.js';
import { YouTubePlayerManager } from './trailer-scroller/player.js';
import {
  createInitialState,
  mergeTrailerPage,
  markTrailerFavorite,
  shouldLoadMore,
  setActiveIndex,
  getVisibleRange
} from './trailer-scroller.state.js';

const LOAD_LIMIT = 8;
const PLAYER_BUFFER = 2;
let scrollerInstanceCounter = 0;

export default function TrailerScrollerPage() {
  const instanceId = ++scrollerInstanceCounter;
  const container = createElement('div', { className: 'trailer-scroller-page' });
  const track = createElement('div', { className: 'trailer-scroller-track' });
  container.appendChild(track);

  const playerManager = new YouTubePlayerManager();
  let state = createInitialState();
  let cleanupFns = [];
  let syncPlayersTimeout = null;
  let syncPlayersRunId = 0;
  let isDestroyed = false;
  let scrollLockY = 0;
  const expandedOverviewIds = new Set();

  function lockViewport() {
    scrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add('trailer-scroller-active');
    document.body.classList.add('trailer-scroller-active');
    document.body.style.top = `-${scrollLockY}px`;
  }

  function unlockViewport() {
    document.documentElement.classList.remove('trailer-scroller-active');
    document.body.classList.remove('trailer-scroller-active');
    document.body.style.top = '';
    window.scrollTo(0, scrollLockY);
  }

  function onCleanup(fn) {
    cleanupFns.push(fn);
  }

  function cleanup() {
    isDestroyed = true;
    playerManager.destroyAll();
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
    if (syncPlayersTimeout) {
      clearTimeout(syncPlayersTimeout);
      syncPlayersTimeout = null;
    }
    syncPlayersRunId += 1;
    unlockViewport();
  }

  function getContainerId(index) {
    return `trailer-player-${instanceId}-${index}`;
  }

  function createSlide(trailer, index) {
    const containerId = getContainerId(index);

    const playerTarget = createElement('div', {
      className: 'trailer-youtube-player',
      id: containerId
    });
    const moreVideosMask = createElement('div', {
      className: 'trailer-youtube-more-mask',
      'aria-hidden': 'true'
    });
    const videoContainer = createElement('div', { className: 'trailer-video-container' },
      playerTarget,
      moreVideosMask
    );

    const thumbnail = createElement('img', {
      className: 'trailer-video-thumb',
      src: `https://img.youtube.com/vi/${trailer.youtubeVideoId}/hqdefault.jpg`,
      alt: trailer.title,
      loading: 'lazy'
    });

    const likeButton = createElement('button', {
      className: `trailer-action trailer-action-like${trailer.isFavorite ? ' is-favorite' : ''}`,
      type: 'button',
      'aria-label': trailer.isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen',
      'aria-pressed': String(Boolean(trailer.isFavorite)),
      onClick: () => toggleFavorite(trailer.itemId)
    },
      createElement('span', { className: 'trailer-action-icon' }, '♥')
    );

    const detailButton = createElement('button', {
      className: 'trailer-action trailer-action-detail',
      type: 'button',
      'aria-label': 'Detailseite öffnen',
      onClick: () => { window.location.hash = `#/item/${trailer.itemId}`; }
    },
      createElement('span', { className: 'trailer-action-icon' }, 'ⓘ')
    );

    const actions = createElement('div', { className: 'trailer-actions' }, likeButton, detailButton);

    const meta = createElement('div', { className: 'trailer-info-meta' });
    if (trailer.year) {
      meta.appendChild(createElement('span', {}, String(trailer.year)));
    }
    if (trailer.typeLabel || trailer.itemType) {
      meta.appendChild(createElement('span', {}, trailer.typeLabel || (trailer.itemType === 'Movie' ? 'Film' : 'Serie')));
    }
    if (trailer.fsk) {
      meta.appendChild(createElement('span', { className: 'trailer-info-fsk' }, trailer.fsk));
    }
    if (trailer.rating) {
      meta.appendChild(createElement('span', { className: 'trailer-info-rating' }, `⭐ ${Number(trailer.rating).toFixed(1)}`));
    }

    const title = createElement('h2', { className: 'trailer-info-title' }, trailer.title);
    const isExpanded = expandedOverviewIds.has(trailer.itemId);
    const hasLongOverview = (trailer.overview || '').length > 180;
    const overview = createElement('p', {
      className: `trailer-info-overview${isExpanded ? ' is-expanded' : ''}`
    }, trailer.overview);
    const overviewToggle = hasLongOverview
      ? createElement('button', {
        className: 'trailer-overview-toggle',
        type: 'button',
        onClick: () => toggleOverview(trailer.itemId)
      }, isExpanded ? 'Weniger zeigen' : 'Mehr lesen')
      : null;

    const info = createElement('div', { className: 'trailer-info' }, meta, title, overview, overviewToggle);
    const card = createElement('div', { className: 'trailer-card' }, videoContainer, thumbnail, actions, info);

    const slide = createElement('div', {
      className: 'trailer-slide',
      'data-index': index,
      'data-id': trailer.id
    }, card);

    return slide;
  }

  function renderSlides() {
    const existingSlides = Array.from(track.children);
    const existingCount = existingSlides.length;

    state.trailers.slice(existingCount).forEach((trailer, offset) => {
      const index = existingCount + offset;
      const slide = createSlide(trailer, index);
      track.appendChild(slide);
      if (intersectionObserver) {
        intersectionObserver.observe(slide);
      }
    });

    existingSlides.forEach((slide, index) => {
      const trailer = state.trailers[index];
      if (!trailer) return;
      const likeButton = slide.querySelector('.trailer-action-like');
      if (likeButton) {
        likeButton.classList.toggle('is-favorite', trailer.isFavorite);
        likeButton.setAttribute('aria-label', trailer.isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen');
        likeButton.setAttribute('aria-pressed', String(Boolean(trailer.isFavorite)));
      }

      const overview = slide.querySelector('.trailer-info-overview');
      if (overview) {
        overview.classList.toggle('is-expanded', expandedOverviewIds.has(trailer.itemId));
      }
      const overviewToggle = slide.querySelector('.trailer-overview-toggle');
      if (overviewToggle) {
        overviewToggle.textContent = expandedOverviewIds.has(trailer.itemId) ? 'Weniger zeigen' : 'Mehr lesen';
      }
    });
  }

  function updateActiveClasses() {
    const slides = Array.from(track.children);
    slides.forEach((slide, index) => {
      slide.classList.toggle('is-active', index === state.activeIndex);
      slide.classList.toggle('is-prev', index === state.activeIndex - 1);
      slide.classList.toggle('is-next', index === state.activeIndex + 1);
    });
  }

  async function syncPlayers() {
    if (isDestroyed) return;
    const runId = ++syncPlayersRunId;

    if (syncPlayersTimeout) {
      clearTimeout(syncPlayersTimeout);
    }

    syncPlayersTimeout = setTimeout(async () => {
      if (isDestroyed || runId !== syncPlayersRunId) return;

      const { start, end } = getVisibleRange(state.activeIndex, state.trailers.length, PLAYER_BUFFER);
      const visibleIds = new Set();

      for (let i = start; i < end; i++) {
        const trailer = state.trailers[i];
        if (!trailer) continue;
        const containerId = getContainerId(i);
        visibleIds.add(containerId);

        const slide = track.children[i];
        if (!slide) continue;

        const thumb = slide.querySelector('.trailer-video-thumb');

        const isActive = i === state.activeIndex;
        const existingPlayer = playerManager.players.get(containerId);

        if (existingPlayer) {
          if (thumb) thumb.style.opacity = '0';
          if (isActive) playerManager.play(containerId);
          else playerManager.pause(containerId);
          continue;
        }

        await playerManager.createPlayer(containerId, trailer.youtubeVideoId, {
          autoplay: isActive ? 1 : 0,
          muted: false,
          onReady: () => {
            if (isDestroyed || runId !== syncPlayersRunId) return;
            if (thumb) thumb.style.opacity = '0';
            if (isActive) {
              playerManager.play(containerId);
            } else {
              playerManager.pause(containerId);
            }
          },
          onError: () => {
            if (thumb) thumb.style.opacity = '1';
          }
        });

        if (isDestroyed || runId !== syncPlayersRunId) return;
      }

      for (const [containerId] of playerManager.players) {
        if (!visibleIds.has(containerId)) {
          playerManager.destroy(containerId);
        }
      }

      for (let i = 0; i < state.trailers.length; i++) {
        if (i >= start && i < end) continue;
        const slide = track.children[i];
        if (!slide) continue;
        const thumb = slide.querySelector('.trailer-video-thumb');
        if (thumb) thumb.style.opacity = '1';
      }
    }, 100);
  }

  function resyncActivePlayer() {
    if (isDestroyed || state.introOpen || state.trailers.length === 0) return;
    syncPlayers();
  }

  function scheduleActivePlayerResync() {
    requestAnimationFrame(() => {
      requestAnimationFrame(resyncActivePlayer);
    });
  }

  function setActive(index) {
    state = setActiveIndex(state, index);
    updateActiveClasses();

    const slide = track.children[state.activeIndex];
    if (slide) {
      track.scrollTo({
        top: slide.offsetTop,
        behavior: 'smooth'
      });
    }

    syncPlayers();

    if (shouldLoadMore(state)) {
      loadTrailers();
    }
  }

  async function loadTrailers(refresh = false) {
    if (state.loading || (!state.hasMore && !refresh)) return;

    state = { ...state, loading: true };
    appStore.setLoading(true);

    try {
      const page = await MediaApi.getTrailers(refresh ? null : state.cursor, LOAD_LIMIT, refresh);
      state = mergeTrailerPage(state, page);
      renderSlides();

      if (refresh) {
        if (intersectionObserver) intersectionObserver.disconnect();
        playerManager.destroyAll();
        track.innerHTML = '';
        state = { ...state, trailers: [], seenIds: new Set() };
        state = mergeTrailerPage(state, page);
        renderSlides();
        setActive(0);
      } else if (state.trailers.length > 0 && state.activeIndex === 0 && !state.introOpen) {
        setActive(0);
      }
    } catch (error) {
      if (error.isAuthError) return;
      console.error('[Trailer Scroller Load Error]', error);
      appStore.showToast('Fehler beim Laden der Trailer', 'error');
      state = { ...state, loading: false };
    } finally {
      appStore.setLoading(false);
    }
  }

  async function toggleFavorite(itemId) {
    const currentTrailer = state.trailers.find((trailer) => trailer.itemId === itemId);
    if (!currentTrailer) return;

    const nextIsFavorite = !currentTrailer.isFavorite;
    state = markTrailerFavorite(state, itemId, nextIsFavorite);
    renderSlides();

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
      state = markTrailerFavorite(state, itemId, currentTrailer.isFavorite);
      renderSlides();
    }
  }

  function toggleOverview(itemId) {
    if (expandedOverviewIds.has(itemId)) {
      expandedOverviewIds.delete(itemId);
    } else {
      expandedOverviewIds.add(itemId);
    }
    renderSlides();
  }

  function showEmptyState() {
    track.innerHTML = '';
    track.appendChild(
      createElement('div', { className: 'trailer-empty-state' },
        createElement('h3', {}, 'Keine Trailer gefunden'),
        createElement('p', {}, 'In deiner Jellyfin-Bibliothek sind aktuell keine YouTube-Trailer vorhanden.')
      )
    );
  }

  function handleKeydown(event) {
    if (state.introOpen) return;
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement.tagName)) return;

    switch (event.key) {
      case 'ArrowDown':
      case ' ':
        event.preventDefault();
        setActive(state.activeIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive(state.activeIndex - 1);
        break;
      case 'l':
      case 'L':
        {
          const trailer = state.trailers[state.activeIndex];
          if (trailer) toggleFavorite(trailer.itemId);
        }
        break;
      case 'Enter':
        {
          const trailer = state.trailers[state.activeIndex];
          if (trailer) window.location.hash = `#/item/${trailer.itemId}`;
        }
        break;
    }
  }

  function handleHashChange() {
    if (!window.location.hash.startsWith('#/scroller')) {
      cleanup();
    }
  }

  const intersectionObserver = new IntersectionObserver((entries) => {
    let bestEntry = null;
    entries.forEach((entry) => {
      if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
        bestEntry = entry;
      }
    });

    if (bestEntry && bestEntry.isIntersecting && bestEntry.intersectionRatio >= 0.5) {
      const index = parseInt(bestEntry.target.dataset.index, 10);
      if (!Number.isNaN(index) && index !== state.activeIndex) {
        setActive(index);
      }
    }
  }, { threshold: [0.5, 0.75, 1] });

  onCleanup(() => {
    if (intersectionObserver) intersectionObserver.disconnect();
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('hashchange', handleHashChange);
    window.removeEventListener('pageshow', resyncActivePlayer);
    window.removeEventListener('focus', resyncActivePlayer);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('hashchange', handleHashChange);
  window.addEventListener('pageshow', resyncActivePlayer);
  window.addEventListener('focus', resyncActivePlayer);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  lockViewport();

  function handleVisibilityChange() {
    if (!document.hidden) resyncActivePlayer();
  }

  function waitForConnected() {
    if (container.isConnected) return Promise.resolve();

    return new Promise(resolve => {
      const check = () => {
        if (isDestroyed) {
          resolve();
          return;
        }
        if (container.isConnected) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  }

  async function init() {
    await waitForConnected();
    if (isDestroyed) return;

    await loadTrailers();
    if (isDestroyed) return;

    if (state.trailers.length === 0) {
      showEmptyState();
      return;
    }

    const slides = Array.from(track.children);
    slides.forEach((slide) => intersectionObserver.observe(slide));

    if (state.introOpen) {
      const intro = createIntroModal({
        onStart: () => {
          state = { ...state, introOpen: false };
          setActive(0);
          scheduleActivePlayerResync();
        }
      });
      container.appendChild(intro.element);
    } else {
      setActive(0);
      scheduleActivePlayerResync();
    }
  }

  init();

  return container;
}
