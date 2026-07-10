import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { MediaCard } from '../components/mediaCard.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { getRouteState, saveRouteState, consumeReturnMarker } from '../utils/routeState.js';
import { getFeaturedPublisherById } from '../constants/featuredPublishers.js';
import { PageHeading } from '../components/pageHeading.js';

const LIMIT_OPTIONS = [20, 50, 100];
const DEFAULT_LIMIT = 50;

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

  let currentPage = savedState?.page || 1;
  let currentLimit = savedState?.limit || DEFAULT_LIMIT;
  let totalItems = 0;
  let totalPages = 0;

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

  container.appendChild(
    createElement('div', { className: 'library-content' }, PageHeading({ title: pageTitle }), bodySlot)
  );

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

    applyScroll();
    requestAnimationFrame(applyScroll);
  };

  const loadLibrary = async (page = currentPage, limit = currentLimit) => {
    const restoreTarget = pendingRestore;
    pendingRestore = null;

    bodySlot.innerHTML = '';
    setSectionBusy(bodySlot, true);
    bodySlot.appendChild(createSectionLoader({ label: 'Inhalte werden geladen' }));

    try {
      const args = [type, genre, studio, page, limit];
      if (publisherId) args.push({ publisherId });
      const result = await MediaApi.getLibrary(...args);
      currentPage = page;
      currentLimit = limit;
      totalItems = result.totalItems;
      totalPages = result.totalPages;
      renderLibrary(result.items);
      saveRouteState(routeHash, { page: currentPage, limit: currentLimit });

      if (restoreTarget) {
        restoreScrollPosition(restoreTarget);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      if (error.isAuthError) return;

      console.error('[Library Page Load Error]', error);
      appStore.showToast('Fehler beim Laden der Inhalte', 'error');
      renderError(error.message);
    } finally {
      setSectionBusy(bodySlot, false);
    }
  };

  const renderError = (msg) => {
    bodySlot.innerHTML = '';
    bodySlot.appendChild(
      createElement('div', { className: 'search-empty-state' },
        createElement('h3', {}, 'Fehler beim Laden'),
        createElement('p', {}, msg || 'Die Inhalte konnten nicht geladen werden.'),
        createElement('button', {
          className: 'btn-primary',
          onClick: () => loadLibrary(currentPage, currentLimit)
        }, 'Erneut versuchen')
      )
    );
  };

  const renderLibrary = (items) => {
    bodySlot.innerHTML = '';

    if (items.length === 0) {
      bodySlot.appendChild(
        createElement('div', { className: 'search-empty-state' },
          createElement('h3', {}, 'Keine Inhalte gefunden'),
          createElement('p', {}, `In dieser Kategorie sind aktuell keine Einträge vorhanden.`)
        )
      );
      return;
    }

    const grid = createElement('div', { className: 'library-grid' });
    items.forEach(item => {
      const cardEl = MediaCard({ item, landscape: false, sourceType: 'library' });
      if (cardEl) grid.appendChild(cardEl);
    });

    const pagination = createPagination();

    bodySlot.appendChild(grid);
    bodySlot.appendChild(pagination);
  };

  const createPagination = () => {
    const wrapper = createElement('div', { className: 'pagination' });

    const hasPrev = currentPage > 1;
    const hasNext = currentPage < totalPages;

    const prevBtn = createElement('button', {
      className: `pagination-btn${!hasPrev ? ' disabled' : ''}`,
      disabled: !hasPrev,
      onClick: () => {
        if (hasPrev) loadLibrary(currentPage - 1, currentLimit);
      }
    }, 'Zurück');

    const pageInfo = createElement('span', { className: 'pagination-info' },
      createElement('span', { className: 'pagination-info-desktop' },
        `Seite ${currentPage} von ${totalPages} · ${totalItems} ${totalItems === 1 ? 'Eintrag' : 'Einträge'}`
      ),
      createElement('span', { className: 'pagination-info-mobile' },
        `${currentPage} / ${totalPages} · ${totalItems}`
      )
    );

    const nextBtn = createElement('button', {
      className: `pagination-btn${!hasNext ? ' disabled' : ''}`,
      disabled: !hasNext,
      onClick: () => {
        if (hasNext) loadLibrary(currentPage + 1, currentLimit);
      }
    }, 'Vor');

    const buttonsRow = createElement('div', { className: 'pagination-buttons' },
      prevBtn,
      pageInfo,
      nextBtn
    );

    const limitSelect = createElement('select', {
      className: 'pagination-limit-select',
      onChange: (e) => {
        const newLimit = parseInt(e.target.value, 10);
        loadLibrary(1, newLimit);
      }
    });

    LIMIT_OPTIONS.forEach(opt => {
      const option = createElement('option', {
        value: opt
      }, `${opt} pro Seite`);
      if (opt === currentLimit) option.selected = true;
      limitSelect.appendChild(option);
    });

    const limitRow = createElement('div', { className: 'pagination-limit' }, limitSelect);

    wrapper.appendChild(buttonsRow);
    wrapper.appendChild(limitRow);

    return wrapper;
  };

  loadLibrary();

  return container;
}
