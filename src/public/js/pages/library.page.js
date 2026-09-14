import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { MediaCard } from '../components/mediaCard.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { getRouteState, saveRouteState, consumeReturnMarker } from '../utils/routeState.js';
import { whenConnected } from '../utils/whenConnected.js';
import { getFeaturedPublisherById } from '../constants/featuredPublishers.js';
import { PageHeading } from '../components/pageHeading.js';

// Batch size per request; a multiple of every grid column count so each
// batch ends on a full row. The page loads more as the user nears the end.
const BATCH_SIZE = 36;
const LOAD_AHEAD_MARGIN = '900px';

export default function LibraryPage(params) {
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

  const container = createElement('div', { className: 'page-container content-section library-page' });
  if (pendingRestore) {
    container.dataset.restoreScroll = 'true';
  }

  const labelType = type === 'Series' ? 'Serien' : 'Filme';
  const pageTitle = publisher
    ? publisher.label
    : studio
      ? studio
      : genre
        ? (isMixedType ? `${genre}` : `${labelType}: ${genre}`)
        : (isMixedType ? 'Alle Titel' : `Alle ${labelType}`);

  const bodySlot = createElement('div', { className: 'library-body' });
  const grid = createElement('div', { className: 'library-grid' });
  const sentinel = createElement('div', { className: 'library-sentinel', 'aria-hidden': 'true' });
  const status = createElement('div', { className: 'library-status' });

  container.appendChild(
    createElement('div', { className: 'library-content' }, PageHeading({ title: pageTitle }), bodySlot)
  );

  const fetchPage = (page) => {
    const args = [type, genre, studio, page, BATCH_SIZE];
    if (publisherId) args.push({ publisherId });
    return MediaApi.getLibrary(...args);
  };

  const appendItems = (items) => {
    items.forEach(item => {
      const cardEl = MediaCard({ item, landscape: false, sourceType: 'library' });
      if (cardEl) grid.appendChild(cardEl);
    });
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
      createElement('div', { className: 'search-empty-state' },
        createElement('h3', {}, 'Keine Inhalte gefunden'),
        createElement('p', {}, 'In dieser Kategorie sind aktuell keine Einträge vorhanden.')
      )
    );
  };

  const renderError = (msg, retry) => {
    status.innerHTML = '';
    status.appendChild(
      createElement('div', { className: 'search-empty-state library-error' },
        createElement('h3', {}, 'Fehler beim Laden'),
        createElement('p', {}, msg || 'Die Inhalte konnten nicht geladen werden.'),
        createElement('button', { className: 'btn-primary', onClick: retry }, 'Erneut versuchen')
      )
    );
  };

  const watchSentinel = () => {
    if (observer || typeof IntersectionObserver !== 'function') return;
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore();
    }, { rootMargin: `0px 0px ${LOAD_AHEAD_MARGIN} 0px` });
    observer.observe(sentinel);
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
  // back in one go, otherwise just the first batch.
  const loadInitial = async () => {
    const restoreTarget = pendingRestore;
    pendingRestore = null;
    const pagesWanted = Math.max(1, Math.min(savedState?.pages || 1, 20));

    bodySlot.innerHTML = '';
    setSectionBusy(bodySlot, true);
    bodySlot.appendChild(createSectionLoader({ label: 'Inhalte werden geladen' }));
    loading = true;

    try {
      const results = await Promise.all(
        Array.from({ length: pagesWanted }, (_, index) => fetchPage(index + 1))
      );
      const last = results[results.length - 1];
      totalItems = last.totalItems;
      totalPages = last.totalPages;
      loadedPages = Math.min(pagesWanted, totalPages);

      bodySlot.innerHTML = '';
      const items = results.flatMap(result => result.items);
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
