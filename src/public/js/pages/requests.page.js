import { createElement } from '../utils/dom.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { createPosterPlaceholder } from '../utils/poster.js';

const STATUS_MAP = {
  pending: { label: 'ausstehend', cls: 'pending' },
  approved: { label: 'genehmigt', cls: 'approved' },
  imported: { label: 'importiert', cls: 'imported' },
  rejected: { label: 'abgelehnt', cls: 'rejected' }
};

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export default function RequestsPage() {
  let debounceTimeout = null;
  let myRequests = [];
  let searchResults = [];
  let searchRunId = 0;

  const container = createElement('div', { className: 'page-container content-section' });

  const searchInput = createElement('input', {
    type: 'text',
    className: 'search-input-field',
    placeholder: 'Film oder Serie suchen und anfragen...',
    onInput: (e) => {
      const query = e.target.value.trim();
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => performSearch(query), 450);
    },
    autocomplete: 'off'
  });

  const searchInputWrapper = createElement('div', { className: 'search-input-wrapper' }, searchInput);
  const resultsGrid = createElement('div', { className: 'requests-grid' });

  const statusContainer = createElement('div', { className: 'search-empty-state' },
    createElement('h3', {}, 'Medien anfragen'),
    createElement('p', {}, 'Suche nach Filmen oder Serien und frage sie an.')
  );

  const requestsSection = createElement('div', { className: 'requests-section hidden' },
    createElement('h2', { className: 'requests-section-title' }, 'Meine Anfragen')
  );

  const requestsList = createElement('div', { className: 'requests-list' });

  const searchSection = createElement('div', { className: 'search-container' },
    searchInputWrapper,
    resultsGrid,
    statusContainer
  );

  container.appendChild(searchSection);
  container.appendChild(requestsSection);

  const performSearch = async (query) => {
    const runId = ++searchRunId;
    resultsGrid.innerHTML = '';
    searchResults = [];

    if (!query) {
      appStore.setLoading(false);
      statusContainer.innerHTML = '';
      statusContainer.appendChild(createElement('h3', {}, 'Medien anfragen'));
      statusContainer.appendChild(createElement('p', {}, 'Suche nach Filmen oder Serien und frage sie an.'));
      statusContainer.classList.remove('hidden');
      return;
    }

    statusContainer.classList.add('hidden');
    appStore.setLoading(true);

    try {
      const data = await RequestsApi.search(query);
      if (runId !== searchRunId) return;

      searchResults = data.results || [];
      resultsGrid.innerHTML = '';

      if (searchResults.length === 0) {
        statusContainer.innerHTML = '';
        statusContainer.appendChild(createElement('h3', {}, 'Keine Ergebnisse'));
        statusContainer.appendChild(createElement('p', {}, `Nichts gefunden fuer "${query}".`));
        statusContainer.classList.remove('hidden');
        appStore.setLoading(false);
      } else {
        statusContainer.classList.add('hidden');
        searchResults.forEach(item => {
          resultsGrid.appendChild(createSearchResultCard(item));
        });
        appStore.setLoading(false);
        refreshSearchAvailability(runId, searchResults);
      }
    } catch (error) {
      if (runId !== searchRunId) return;
      if (error.isAuthError) {
        appStore.setLoading(false);
        return;
      }

      console.error('[Requests Search Error]', error);
      appStore.showToast('Suche fehlgeschlagen', 'error');
      appStore.setLoading(false);
    }
  };

  const refreshSearchAvailability = (runId, results) => {
    results.forEach(async (item) => {
      const tmdbId = item.id;
      const tmdbType = item.media_type;

      try {
        const check = await RequestsApi.crossCheck(tmdbId, tmdbType);
        if (runId !== searchRunId) return;

        const existingCard = resultsGrid.querySelector(`[data-tmdb-id="${tmdbId}"]`);
        if (existingCard && check.exists) {
          const btn = existingCard.querySelector('.search-available-badge');
          if (btn) btn.hidden = false;
        }
      } catch {}
    });
  };

  const getTmdbImageUrl = (path, size = 'w500') => {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  const createSearchResultCard = (item) => {
    const isMovie = item.media_type === 'movie';
    const title = item.title || item.name || 'Unbekannt';
    const posterUrl = getTmdbImageUrl(item.poster_path);
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
    const typeLabel = isMovie ? 'Film' : 'Serie';
    const overview = item.overview || 'Keine Beschreibung.';
    const tmdbId = item.id;
    const tmdbType = item.media_type;

    const card = createElement('div', {
      className: 'request-card request-card-clickable',
      'data-tmdb-id': tmdbId,
      onClick: () => {
        window.location.hash = `#/request-detail/${tmdbType}/${tmdbId}`;
      }
    });

    const poster = createElement('img', {
      className: 'request-card-poster',
      src: posterUrl || createPosterPlaceholder(title),
      alt: title,
      loading: 'lazy',
      onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.src = createPosterPlaceholder(title); }
    });

    const info = createElement('div', { className: 'request-card-info' },
      createElement('div', { className: 'request-card-meta' },
        createElement('span', { className: 'request-card-type' }, typeLabel),
        year ? createElement('span', { className: 'request-card-year' }, year) : null
      ),
      createElement('h3', { className: 'request-card-title' }, title),
      createElement('p', { className: 'request-card-overview' }, overview.length > 150 ? overview.substring(0, 150) + '...' : overview)
    );

    const actions = createElement('div', { className: 'request-card-actions' },
      createElement('span', {
        className: 'search-available-badge',
        hidden: true,
        style: 'color: var(--color-primary); font-size: 0.85rem;'
      }, 'In Mediathek verfuegbar')
    );

    card.appendChild(poster);
    card.appendChild(info);
    card.appendChild(actions);

    return card;
  };

  const loadMyRequests = async () => {
    try {
      myRequests = await RequestsApi.getMyRequests();
      if (!Array.isArray(myRequests)) myRequests = [];
      renderMyRequests();
    } catch (error) {
      console.warn('[My Requests Load Error]', error);
      myRequests = [];
      renderMyRequests();
    }
  };

  const renderMyRequests = () => {
    requestsSection.classList.toggle('hidden', myRequests.length === 0);
    requestsList.innerHTML = '';

    myRequests.forEach(req => {
      const statusInfo = STATUS_MAP[req.status] || { label: req.status, cls: 'unknown' };
      const type = req.media_type === 'tv' ? 'Serie' : 'Film';
      const posterUrl = req.poster_path ? getTmdbImageUrl(req.poster_path) : null;

      const item = createElement('div', { className: 'request-item' },
        posterUrl ? createElement('img', {
          className: 'request-card-poster',
          src: posterUrl,
          alt: req.title,
          style: 'width: 40px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 12px;',
          loading: 'lazy'
        }) : null,
        createElement('div', { className: 'request-item-info' },
          createElement('span', { className: 'request-item-title' }, req.title),
          createElement('span', { className: 'request-item-type' }, type)
        ),
        createElement('div', { className: 'request-item-right' },
          createElement('span', { className: `request-status request-status-${statusInfo.cls}` }, statusInfo.label),
          createElement('button', {
            className: 'request-item-delete',
            onClick: (e) => { e.stopPropagation(); deleteRequest(req.id); }
          }, createDeleteIcon())
        )
      );
      requestsList.appendChild(item);
    });

    if (!requestsSection.contains(requestsList)) {
      requestsSection.appendChild(requestsList);
    }
  };

  const deleteRequest = async (id) => {
    try {
      await RequestsApi.deleteRequest(id);
      myRequests = myRequests.filter(r => r.id !== id);
      renderMyRequests();
      appStore.showToast('Anfrage entfernt', 'success');
    } catch (error) {
      if (error.isAuthError) return;

      console.error('[Delete Request Error]', error);
      appStore.showToast('Fehler beim Entfernen', 'error');
    }
  };

  const createDeleteIcon = () => {
    const icon = createElement('span', { className: 'delete-icon', 'aria-hidden': 'true' });
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    return icon;
  };

  loadMyRequests();

  return container;
}
