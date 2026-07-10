import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { createIntroModal } from './trailer-scroller/intro.js';
import { YouTubePlayerManager } from './trailer-scroller/player.js';
import { createScrollerViewportLock } from './trailer-scroller/viewport.js';
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
const TRAILER_QUERY_PARAM = 'trailer';
const RETURN_TRAILER_KEY = 'vantaTrailerScrollerReturnTrailerId';
const RETURN_TRAILER_DATA_KEY = 'vantaTrailerScrollerReturnTrailerData';
let scrollerInstanceCounter = 0;

const SCROLLER_ICONS = {
  previous: '<path d="m18 15-6-6-6 6"></path>',
  next: '<path d="m6 9 6 6 6-6"></path>',
  favorite: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path>',
  details: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path>',
  share: '<circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="m8.2 10.8 7.6-4.5"></path><path d="m8.2 13.2 7.6 4.5"></path>',
  film: '<rect x="3" y="5" width="18" height="14" rx="3"></rect><path d="m10 9 5 3-5 3Z"></path>',
  retry: '<path d="M20 6v5h-5"></path><path d="M4 18v-5h5"></path><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8"></path><path d="M5.5 15A7 7 0 0 0 17.8 17.8L20 16"></path>'
};

function createScrollerIcon(name, className = 'trailer-ui-icon') {
  const icon = createElement('span', { className, 'aria-hidden': 'true' });
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      ${SCROLLER_ICONS[name] || ''}
    </svg>
  `;
  return icon;
}

export default function TrailerScrollerPage() {
  const instanceId = ++scrollerInstanceCounter;
  const container = createElement('div', { className: 'trailer-scroller-page' });
  const viewportLock = createScrollerViewportLock();

  const previousButton = createElement('button', {
    className: 'trailer-nav-button trailer-nav-previous',
    type: 'button',
    disabled: true,
    title: 'Vorheriger Trailer (Pfeil hoch)',
    'aria-label': 'Vorheriger Trailer',
    onClick: () => navigateRelative(-1)
  }, createScrollerIcon('previous'));

  const nextButton = createElement('button', {
    className: 'trailer-nav-button trailer-nav-next',
    type: 'button',
    disabled: true,
    title: 'Nächster Trailer (Pfeil runter)',
    'aria-label': 'Nächster Trailer',
    onClick: () => navigateRelative(1)
  }, createScrollerIcon('next'));

  const header = createElement('header', { className: 'trailer-scroller-header' },
    createElement('div', { className: 'trailer-scroller-heading' },
      createElement('span', { className: 'trailer-scroller-eyebrow' }, 'VANTA Auswahl'),
      createElement('h1', { className: 'trailer-scroller-title' }, 'Trailer entdecken')
    ),
    createElement('p', { className: 'trailer-scroller-hint' },
      createElement('span', { className: 'trailer-hint-key', 'aria-hidden': 'true' }, '↑'),
      createElement('span', { className: 'trailer-hint-key', 'aria-hidden': 'true' }, '↓'),
      createElement('span', {}, 'scrollen · YouTube steuert die Wiedergabe')
    ),
    createElement('div', { className: 'trailer-scroller-navigation' },
      previousButton,
      nextButton
    )
  );

  const track = createElement('div', { className: 'trailer-scroller-track' });
  container.appendChild(header);
  container.appendChild(track);

  const playerManager = new YouTubePlayerManager();
  let state = createInitialState();
  let cleanupFns = [];
  let syncPlayersTimeout = null;
  let syncPlayersRunId = 0;
  let navigationUnlockTimeout = null;
  let isDestroyed = false;
  let shareModal = null;
  let suppressIntersectionUpdates = true;
  let lastLoadFailed = false;
  const expandedOverviewIds = new Set();

  function onCleanup(fn) {
    cleanupFns.push(fn);
  }

  function cleanup() {
    isDestroyed = true;
    playerManager.destroyAll();
    closeShareModal();
    cleanupFns.forEach((fn) => fn());
    cleanupFns = [];
    if (syncPlayersTimeout) {
      clearTimeout(syncPlayersTimeout);
      syncPlayersTimeout = null;
    }
    if (navigationUnlockTimeout) {
      clearTimeout(navigationUnlockTimeout);
      navigationUnlockTimeout = null;
    }
    syncPlayersRunId += 1;
    viewportLock.unlock();
  }

  function getContainerId(index) {
    return `trailer-player-${instanceId}-${index}`;
  }

  function getHashParams() {
    const [, query = ''] = (window.location.hash || '').split('?');
    return new URLSearchParams(query);
  }

  function getTrailerIdFromHash() {
    return getHashParams().get(TRAILER_QUERY_PARAM);
  }

  function getInitialTrailerId() {
    const hashTrailerId = getTrailerIdFromHash();
    let returnTrailerId = null;

    try {
      returnTrailerId = sessionStorage.getItem(RETURN_TRAILER_KEY);
      sessionStorage.removeItem(RETURN_TRAILER_KEY);
    } catch {
      // ignore
    }

    return hashTrailerId || returnTrailerId;
  }

  function consumeReturnTrailerData(expectedTrailerId) {
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
  }

  function getTrailerShareUrl(trailer) {
    const url = new URL(window.location.href);
    url.hash = getTrailerHash(trailer);
    return url.toString();
  }

  function getTrailerHash(trailer) {
    return `#/scroller?${TRAILER_QUERY_PARAM}=${encodeURIComponent(trailer.id)}`;
  }

  function getDetailHash(trailer) {
    return `#/item/${trailer.itemId}?returnTo=${encodeURIComponent(getTrailerHash(trailer))}`;
  }

  function setCurrentHashWithoutNavigation(hash) {
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}${hash}`
    );
  }

  function navigateToDetail(trailer) {
    if (!trailer) return;

    rememberReturnTrailer(trailer);
    setCurrentHashWithoutNavigation(getTrailerHash(trailer));
    window.location.hash = getDetailHash(trailer);
  }

  function updateTrailerHash(trailer) {
    if (!trailer || !window.location.hash.startsWith('#/scroller')) return;

    const nextHash = getTrailerHash(trailer);
    if (window.location.hash === nextHash) return;

    setCurrentHashWithoutNavigation(nextHash);
  }

  function rememberReturnTrailer(trailer) {
    if (!trailer) return;

    try {
      sessionStorage.setItem(RETURN_TRAILER_KEY, trailer.id);
      sessionStorage.setItem(RETURN_TRAILER_DATA_KEY, JSON.stringify(trailer));
    } catch {
      // ignore
    }
  }

  function findTrailerIndex(trailerId) {
    if (!trailerId) return -1;
    return state.trailers.findIndex((trailer) => trailer.id === trailerId);
  }

  function updateChrome() {
    const total = state.trailers.length;

    previousButton.disabled = total === 0 || state.activeIndex <= 0;
    nextButton.disabled = total === 0 || (state.activeIndex >= total - 1 && !state.hasMore) || state.loading;
    container.classList.toggle('is-feed-loading', state.loading);
  }

  function showLoadingState() {
    if (state.trailers.length > 0) return;

    track.replaceChildren(
      createElement('div', {
        className: 'trailer-feed-state trailer-loading-state',
        role: 'status',
        'aria-live': 'polite'
      },
        createElement('div', { className: 'trailer-loading-preview', 'aria-hidden': 'true' },
          createElement('div', { className: 'trailer-loading-video' }),
          createElement('div', { className: 'trailer-loading-lines' },
            createElement('span', {}),
            createElement('span', {}),
            createElement('span', {})
          )
        ),
        createElement('p', { className: 'trailer-feed-state-title' }, 'Trailer werden vorbereitet'),
        createElement('p', { className: 'trailer-feed-state-text' }, 'VANTA lädt deine YouTube-Trailer und bereitet den ersten Player vor.')
      )
    );
  }

  function showErrorState(error) {
    track.replaceChildren(
      createElement('div', {
        className: 'trailer-feed-state trailer-error-state',
        role: 'alert'
      },
        createScrollerIcon('retry', 'trailer-feed-state-icon'),
        createElement('p', { className: 'trailer-feed-state-title' }, 'Trailer konnten nicht geladen werden'),
        createElement('p', { className: 'trailer-feed-state-text' },
          error?.message || 'Bitte prüfe die Verbindung zu deiner Mediathek und versuche es erneut.'
        ),
        createElement('button', {
          className: 'trailer-feed-state-action',
          type: 'button',
          onClick: () => loadTrailers(false, { activateFirst: true })
        }, createScrollerIcon('retry'), 'Erneut versuchen')
      )
    );
  }

  async function navigateRelative(direction) {
    if (state.trailers.length === 0 || state.loading) return;

    const targetIndex = state.activeIndex + direction;
    if (targetIndex < 0) return;

    if (targetIndex >= state.trailers.length) {
      if (!state.hasMore) return;

      const previousLength = state.trailers.length;
      await loadTrailers(false, { activateFirst: false });
      if (state.trailers.length > previousLength) {
        setActive(previousLength);
      }
      return;
    }

    setActive(targetIndex);
  }

  function closeShareModal() {
    if (!shareModal) return;
    shareModal.remove();
    shareModal = null;
  }

  async function copyShareUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      appStore.showToast('Link kopiert', 'success');
    } catch {
      appStore.showToast('Link konnte nicht kopiert werden', 'error');
    }
  }

  function openShareModal(trailer) {
    closeShareModal();

    const shareUrl = getTrailerShareUrl(trailer);

    const urlInput = createElement('input', {
      className: 'trailer-share-url',
      type: 'text',
      value: shareUrl,
      readonly: true,
      onFocus: (event) => event.target.select()
    });

    const nativeShareButton = navigator.share
      ? createElement('button', {
        className: 'trailer-share-button trailer-share-native',
        type: 'button',
        onClick: async () => {
          try {
            await navigator.share({ title: trailer.title, text: `Trailer ansehen: ${trailer.title}`, url: shareUrl });
            closeShareModal();
          } catch {
            // User canceled or platform rejected the share request.
          }
        }
      }, 'Teilen')
      : null;

    const copyButton = createElement('button', {
      className: 'trailer-share-button trailer-share-copy',
      type: 'button',
      onClick: () => copyShareUrl(shareUrl)
    }, 'Kopieren');

    const modalContent = createElement('div', {
      className: 'trailer-share-content',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'trailer-share-title'
    },
      createElement('button', {
        className: 'trailer-share-close',
        type: 'button',
        'aria-label': 'Teilen schließen',
        onClick: closeShareModal
      }, '×'),
      createElement('h3', { className: 'trailer-share-title', id: 'trailer-share-title' }, 'Trailer teilen'),
      createElement('p', { className: 'trailer-share-text' }, trailer.title),
      urlInput,
      createElement('div', { className: 'trailer-share-options' },
        copyButton,
        nativeShareButton || createElement('button', {
          className: 'trailer-share-button trailer-share-native',
          type: 'button',
          onClick: () => copyShareUrl(shareUrl)
        }, 'Teilen')
      )
    );

    shareModal = createElement('div', {
      className: 'trailer-share-backdrop',
      onClick: (event) => {
        if (event.target === shareModal) closeShareModal();
      }
    }, modalContent);

    container.appendChild(shareModal);
    urlInput.select();
  }

  function createSlide(trailer, index) {
    const containerId = getContainerId(index);
    const titleId = `trailer-title-${instanceId}-${index}`;

    const playerTarget = createElement('div', {
      className: 'trailer-youtube-player',
      id: containerId
    });

    const thumbnail = createElement('img', {
      className: 'trailer-video-thumb',
      src: `https://img.youtube.com/vi/${trailer.youtubeVideoId}/hqdefault.jpg`,
      alt: '',
      'aria-hidden': 'true',
      loading: 'lazy'
    });

    const videoContainer = createElement('div', { className: 'trailer-video-container' },
      playerTarget,
      thumbnail
    );

    const likeButton = createElement('button', {
      className: `trailer-action trailer-action-like${trailer.isFavorite ? ' is-favorite' : ''}`,
      type: 'button',
      'aria-label': trailer.isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen',
      'aria-pressed': String(Boolean(trailer.isFavorite)),
      onClick: () => toggleFavorite(trailer.itemId)
    },
      createScrollerIcon('favorite', 'trailer-action-icon'),
      createElement('span', { className: 'trailer-action-label' }, trailer.isFavorite ? 'Gespeichert' : 'Favorit')
    );

    const detailButton = createElement('button', {
      className: 'trailer-action trailer-action-detail',
      type: 'button',
      'aria-label': 'Detailseite öffnen',
      onClick: () => {
        navigateToDetail(trailer);
      }
    },
      createScrollerIcon('details', 'trailer-action-icon'),
      createElement('span', { className: 'trailer-action-label' }, 'Details')
    );

    const shareButton = createElement('button', {
      className: 'trailer-action trailer-action-share',
      type: 'button',
      'aria-label': 'Trailer teilen',
      onClick: () => openShareModal(trailer)
    },
      createScrollerIcon('share', 'trailer-action-icon'),
      createElement('span', { className: 'trailer-action-label' }, 'Teilen')
    );

    const actions = createElement('div', { className: 'trailer-actions' }, likeButton, detailButton, shareButton);

    const meta = createElement('div', { className: 'trailer-info-meta' });
    if (trailer.year) {
      meta.appendChild(createElement('span', { className: 'trailer-meta-chip' }, String(trailer.year)));
    }
    if (trailer.typeLabel || trailer.itemType) {
      meta.appendChild(createElement('span', { className: 'trailer-meta-chip trailer-meta-type' },
        trailer.typeLabel || (trailer.itemType === 'Movie' ? 'Film' : 'Serie')
      ));
    }
    if (trailer.fsk) {
      meta.appendChild(createElement('span', { className: 'trailer-meta-chip trailer-info-fsk' }, trailer.fsk));
    }
    if (trailer.rating) {
      meta.appendChild(createElement('span', { className: 'trailer-meta-chip trailer-info-rating' }, `★ ${Number(trailer.rating).toFixed(1)}`));
    }

    const title = createElement('h2', { className: 'trailer-info-title', id: titleId }, trailer.title);
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

    const playerStatus = createElement('div', {
      className: 'trailer-player-status',
      role: 'status',
      'aria-live': 'polite'
    },
      createElement('span', { className: 'trailer-player-status-dot', 'aria-hidden': 'true' }),
      createElement('span', { className: 'trailer-player-status-text' }, 'YouTube-Player wird vorbereitet'),
      createElement('button', {
        className: 'trailer-player-skip',
        type: 'button',
        onClick: () => navigateRelative(1)
      }, 'Nächster Trailer')
    );

    const info = createElement('div', { className: 'trailer-info' },
      playerStatus,
      meta,
      title,
      overview,
      overviewToggle,
      actions
    );
    const card = createElement('article', { className: 'trailer-card', 'aria-labelledby': titleId }, videoContainer, info);

    const slide = createElement('div', {
      className: 'trailer-slide',
      'data-index': index,
      'data-id': trailer.id
    }, card);

    return slide;
  }

  function renderSlides() {
    const existingSlides = Array.from(track.querySelectorAll('.trailer-slide'));
    const existingCount = existingSlides.length;

    if (existingCount === 0 && state.trailers.length > 0) {
      track.replaceChildren();
    }

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
        const likeLabel = likeButton.querySelector('.trailer-action-label');
        if (likeLabel) likeLabel.textContent = trailer.isFavorite ? 'Gespeichert' : 'Favorit';
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

    updateChrome();
  }

  function updateActiveClasses() {
    const slides = Array.from(track.children);
    slides.forEach((slide, index) => {
      slide.classList.toggle('is-active', index === state.activeIndex);
      slide.classList.toggle('is-prev', index === state.activeIndex - 1);
      slide.classList.toggle('is-next', index === state.activeIndex + 1);
    });
  }

  function setPlayerStatus(slide, status) {
    if (!slide) return;

    slide.classList.toggle('is-player-ready', status === 'ready');
    slide.classList.toggle('has-player-error', status === 'error');

    const statusText = slide.querySelector('.trailer-player-status-text');
    if (!statusText) return;

    if (status === 'ready') {
      statusText.textContent = '';
    } else if (status === 'error') {
      statusText.textContent = 'Dieser YouTube-Trailer ist nicht verfügbar';
    } else {
      statusText.textContent = 'YouTube-Player wird vorbereitet';
    }
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

        if (slide.classList.contains('has-player-error')) continue;

        const isActive = i === state.activeIndex;
        const existingPlayer = playerManager.players.get(containerId);

        if (existingPlayer) {
          setPlayerStatus(slide, 'ready');
          if (isActive) playerManager.play(containerId);
          else playerManager.pause(containerId);
          continue;
        }

        setPlayerStatus(slide, 'loading');
        try {
          await playerManager.createPlayer(containerId, trailer.youtubeVideoId, {
            autoplay: isActive ? 1 : 0,
            muted: false,
            onReady: () => {
              if (isDestroyed || runId !== syncPlayersRunId) return;
              setPlayerStatus(slide, 'ready');
              if (isActive) {
                playerManager.play(containerId);
              } else {
                playerManager.pause(containerId);
              }
            },
            onError: () => {
              setPlayerStatus(slide, 'error');
            }
          });
        } catch (error) {
          console.error('[Trailer YouTube Player Error]', error);
          setPlayerStatus(slide, 'error');
        }

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
        setPlayerStatus(slide, 'loading');
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

  function scrollToSlide(slide, behavior) {
    if (!slide) return;

    suppressIntersectionUpdates = true;
    if (navigationUnlockTimeout) clearTimeout(navigationUnlockTimeout);

    if (typeof track.scrollTo === 'function') {
      track.scrollTo({ top: slide.offsetTop, behavior });
    } else {
      track.scrollTop = slide.offsetTop;
    }

    navigationUnlockTimeout = setTimeout(() => {
      suppressIntersectionUpdates = false;
      navigationUnlockTimeout = null;
    }, behavior === 'smooth' ? 450 : 0);
  }

  function setActive(index, { behavior = 'smooth', scroll = true } = {}) {
    state = setActiveIndex(state, index);
    updateActiveClasses();
    updateChrome();
    const activeTrailer = state.trailers[state.activeIndex];
    updateTrailerHash(activeTrailer);

    const slide = track.children[state.activeIndex];
    if (scroll) scrollToSlide(slide, behavior);

    syncPlayers();

    if (shouldLoadMore(state)) {
      loadTrailers();
    }
  }

  async function loadTrailers(refresh = false, { activateFirst = true, targetTrailerId = null } = {}) {
    if (state.loading || (!state.hasMore && !refresh)) return;

    state = { ...state, loading: true };
    lastLoadFailed = false;
    updateChrome();
    showLoadingState();
    appStore.setLoading(true);

    try {
      const page = await MediaApi.getTrailers(
        refresh ? null : state.cursor,
        LOAD_LIMIT,
        refresh,
        targetTrailerId
      );
      state = mergeTrailerPage(state, page);
      lastLoadFailed = false;
      renderSlides();

      if (refresh) {
        if (intersectionObserver) intersectionObserver.disconnect();
        playerManager.destroyAll();
        track.innerHTML = '';
        state = { ...state, trailers: [], seenIds: new Set() };
        state = mergeTrailerPage(state, page);
        renderSlides();
        setActive(0);
      } else if (activateFirst && state.trailers.length > 0 && state.activeIndex === 0 && !state.introOpen) {
        setActive(0);
      }
    } catch (error) {
      if (error.isAuthError) {
        state = { ...state, loading: false };
        lastLoadFailed = true;
        return;
      }
      console.error('[Trailer Scroller Load Error]', error);
      appStore.showToast('Fehler beim Laden der Trailer', 'error');
      state = { ...state, loading: false };
      lastLoadFailed = true;
      if (state.trailers.length === 0) showErrorState(error);
    } finally {
      appStore.setLoading(false);
      updateChrome();
    }
  }

  async function loadUntilTrailerFound(trailerId) {
    if (!trailerId) return -1;

    let index = findTrailerIndex(trailerId);
    while (index === -1 && state.hasMore && !isDestroyed) {
      await loadTrailers(false, { activateFirst: false });
      index = findTrailerIndex(trailerId);
    }

    return index;
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
    track.replaceChildren(
      createElement('div', { className: 'trailer-feed-state trailer-empty-state' },
        createScrollerIcon('film', 'trailer-feed-state-icon'),
        createElement('p', { className: 'trailer-feed-state-title' }, 'Keine Trailer gefunden'),
        createElement('p', { className: 'trailer-feed-state-text' },
          'In deiner Jellyfin-Bibliothek sind aktuell keine abspielbaren YouTube-Trailer hinterlegt.'
        ),
        createElement('button', {
          className: 'trailer-feed-state-action',
          type: 'button',
          onClick: () => loadTrailers(true, { activateFirst: true })
        }, createScrollerIcon('retry'), 'Bibliothek erneut prüfen')
      )
    );
    updateChrome();
  }

  function handleKeydown(event) {
    if (shareModal && event.key === 'Escape') {
      event.preventDefault();
      closeShareModal();
      return;
    }

    if (state.introOpen) return;
    if (document.activeElement && ['INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement.tagName)) return;

    switch (event.key) {
      case 'ArrowDown':
      case ' ':
        event.preventDefault();
        navigateRelative(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        navigateRelative(-1);
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
          if (trailer) {
            navigateToDetail(trailer);
          }
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
    if (suppressIntersectionUpdates) return;

    let bestEntry = null;
    entries.forEach((entry) => {
      if (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio) {
        bestEntry = entry;
      }
    });

    if (bestEntry && bestEntry.isIntersecting && bestEntry.intersectionRatio >= 0.5) {
      const index = parseInt(bestEntry.target.dataset.index, 10);
      if (!Number.isNaN(index) && index !== state.activeIndex) {
        setActive(index, { scroll: false });
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
    viewportLock.lock();

    const initialTrailerId = getInitialTrailerId();
    const initialTrailerData = initialTrailerId ? consumeReturnTrailerData(initialTrailerId) : null;
    if (initialTrailerId) {
      state = { ...state, introOpen: false };
    }

    if (initialTrailerData) {
      state = {
        ...state,
        trailers: [initialTrailerData],
        seenIds: new Set([initialTrailerData.id])
      };
      renderSlides();
    }

    await loadTrailers(false, { activateFirst: !initialTrailerId, targetTrailerId: initialTrailerId });
    if (isDestroyed) return;

    let initialIndex = 0;
    if (initialTrailerId) {
      initialIndex = await loadUntilTrailerFound(initialTrailerId);
      if (initialIndex === -1) {
        initialIndex = 0;
        appStore.showToast('Geteilter Trailer ist nicht mehr verfügbar', 'error');
      }
    }

    if (state.trailers.length === 0) {
      if (!lastLoadFailed) showEmptyState();
      return;
    }

    const slides = Array.from(track.children);
    slides.forEach((slide) => intersectionObserver.observe(slide));

    if (state.introOpen) {
      const intro = createIntroModal({
        onStart: () => {
          state = { ...state, introOpen: false };
          setActive(initialIndex, { behavior: 'auto' });
          scheduleActivePlayerResync();
          requestAnimationFrame(() => {
            suppressIntersectionUpdates = false;
          });
        }
      });
      container.appendChild(intro.element);
    } else {
      setActive(initialIndex, { behavior: 'auto' });
      scheduleActivePlayerResync();
      requestAnimationFrame(() => {
        suppressIntersectionUpdates = false;
      });
    }
  }

  showLoadingState();
  updateChrome();
  init();

  return container;
}
