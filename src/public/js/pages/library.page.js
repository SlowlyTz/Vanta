// Library grid for a type, genre, studio or publisher, loaded in batches as
// the user scrolls and restored on the way back from a detail page.
import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { MediaCard } from '../components/mediaCard.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { getRouteState, saveRouteState, consumeReturnMarker } from '../utils/routeState.js';
import { whenConnected } from '../utils/whenConnected.js';
import { getFeaturedPublisherById } from '../shared/featuredPublishers.js';
import { resolvePageScope } from '../utils/pageScope.js';
import { EmptyState, ErrorState } from '../components/emptyState.js';
import { PageHeading } from '../components/pageHeading.js';
import { genreLabel } from '../shared/genreLabels.js';

// Batch size per request; a multiple of every grid column count so each
// batch ends on a full row. The page loads more as the user nears the end.
const BATCH_SIZE = 36;
const LOAD_AHEAD_MARGIN = '900px';

export default function LibraryPage(params, pageScope) {
  const scope = resolvePageScope(pageScope);
  const type = params.type || 'Movie';
  const genre = params.genreName || params.genre || null;
  const publisherId = params.publisherId || null;
  const publisher = publisherId ? getFeaturedPublisherById(publisherId) : null;
  const studio = publisherId ? null : (params.studioName || params.studio || null);
  const isMixedType = type.includes(',');

  const routeHash = window.location.hash;
  const returnMarker = consumeReturnMarker(routeHash);
  const savedState = returnMarker ? getRouteState(routeHash) : null;
  let pendingRestore = returnMarker ? { scrollY: returnMarker.scrollY, itemId: returnMarker.itemId } : null;

  let loadedPages = 0;
  let totalItems = 0;
  let totalPages = 0;
  let loading = false;
  let observer = null;

  const container = createElement('div', { className: 'page-container content-section library-page', 'data-tv-backdrop': '' });
  if (pendingRestore) {
    container.dataset.restoreScroll = 'true';
  }

  const labelType = type === 'Series' ? 'Serien' : 'Filme';
  const pageTitle = publisher
    ? publisher.label
    : studio
      ? studio
      : genre
        ? (isMixedType ? genreLabel(genre) : `${labelType}: ${genreLabel(genre)}`)
        : (isMixedType ? 'Alle Titel' : `Alle ${labelType}`);

  const bodySlot = createElement('div', { className: 'library-body' });
  const grid = createElement('div', { className: 'library-grid' });
  const sentinel = createElement('div', { className: 'library-sentinel', 'aria-hidden': 'true' });
  const status = createElement('div', { className: 'library-status' });

  container.appendChild(
    createElement('div', { className: 'library-content' }, PageHeading({ title: pageTitle }), bodySlot)
  );

  const fetchPage = (page, limit = BATCH_SIZE) => {
    return MediaApi.getLibrary(type, genre, studio, page, limit, { publisherId, signal: scope.signal });
  };

  // One insertion per batch, however many cards it brings.
  const appendItems = (items) => {
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
      const cardEl = MediaCard({ item, landscape: false, sourceType: 'library' });
      if (cardEl) fragment.appendChild(cardEl);
    });
    grid.appendChild(fragment);
  };

  const hasMore = () => loadedPages < totalPages;

  const renderStatus = () => {
    status.innerHTML = '';
    if (loading) {
      status.appendChild(createSectionLoader({ label: 'Weitere Inhalte werden geladen', compact: true }));
      return;
    }
    if (totalItems > 0 && !hasMore()) {
      status.appendChild(createElement('p', { className: 'library-end' },
        `${totalItems} Titel · Ende erreicht`));
    }
  };

  const restoreScrollPosition = ({ scrollY, itemId }) => {
    const applyScroll = () => {
      const cardEl = itemId
        ? Array.from(container.querySelectorAll('[data-item-id]')).find(el => el.dataset.itemId === itemId)
        : null;

      if (cardEl) {
        cardEl.scrollIntoView({ block: 'center' });
        return;
      }

      if (Number.isFinite(scrollY)) {
        window.scrollTo(0, scrollY);
      }
    };

    whenConnected(container, () => {
      applyScroll();
      requestAnimationFrame(applyScroll);
    });
  };

  const renderEmpty = () => {
    bodySlot.innerHTML = '';
    bodySlot.appendChild(
      EmptyState({ title: 'Keine Inhalte gefunden', message: 'In dieser Kategorie sind aktuell keine Einträge vorhanden.' })
    );
  };

  const renderError = (msg, retry) => {
    status.innerHTML = '';
    status.appendChild(
      ErrorState({ message: msg || 'Die Inhalte konnten nicht geladen werden.', retry, className: 'library-error' })
    );
  };

  const watchSentinel = () => {
    if (observer || typeof IntersectionObserver !== 'function') return;
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore();
    }, { rootMargin: `0px 0px ${LOAD_AHEAD_MARGIN} 0px` });
    observer.observe(sentinel);
    scope.onLeave(() => observer?.disconnect());
  };

  const loadMore = async () => {
    if (loading || !hasMore()) return;
    loading = true;
    renderStatus();

    try {
      const result = await fetchPage(loadedPages + 1);
      loadedPages += 1;
      totalItems = result.totalItems;
      totalPages = result.totalPages;
      appendItems(result.items);
      saveRouteState(routeHash, { pages: loadedPages });
    } catch (error) {
      if (error.isAuthError) return;
      console.error('[Library Page Load Error]', error);
      loading = false;
      renderError(error.message, loadMore);
      return;
    }

    loading = false;
    renderStatus();
    if (!hasMore()) observer?.disconnect();
  };

  // First load: everything that was on screen before a detail visit comes
  // back in one request (the catalogue is local, so one big page is cheap),
  // otherwise just the first batch.
  const loadInitial = async () => {
    const restoreTarget = pendingRestore;
    pendingRestore = null;
    const pagesWanted = Math.max(1, Math.min(savedState?.pages || 1, 20));

    bodySlot.innerHTML = '';
    setSectionBusy(bodySlot, true);
    bodySlot.appendChild(createSectionLoader({ label: 'Inhalte werden geladen' }));
    loading = true;

    try {
      const result = await fetchPage(1, pagesWanted * BATCH_SIZE);
      totalItems = result.totalItems;
      totalPages = Math.ceil(totalItems / BATCH_SIZE);
      loadedPages = Math.min(pagesWanted, totalPages);

      bodySlot.innerHTML = '';
      const items = result.items || [];
      if (items.length === 0) {
        renderEmpty();
        return;
      }

      appendItems(items);
      bodySlot.appendChild(grid);
      bodySlot.appendChild(sentinel);
      bodySlot.appendChild(status);
      saveRouteState(routeHash, { pages: loadedPages });
      loading = false;
      renderStatus();

      if (restoreTarget) {
        restoreScrollPosition(restoreTarget);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (hasMore()) watchSentinel();
    } catch (error) {
      if (error.isAuthError) return;

      console.error('[Library Page Load Error]', error);
      appStore.showToast('Fehler beim Laden der Inhalte', 'error');
      bodySlot.innerHTML = '';
      bodySlot.appendChild(status);
      loading = false;
      renderError(error.message, loadInitial);
    } finally {
      loading = false;
      setSectionBusy(bodySlot, false);
    }
  };

  loadInitial();

  return container;
}
