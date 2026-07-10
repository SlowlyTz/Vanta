import { createElement } from '../utils/dom.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { createPosterPlaceholder } from '../utils/poster.js';

const STATUS_MAP = {
  pending: { label: 'ausstehend', cls: 'pending' },
  approved: { label: 'genehmigt', cls: 'approved' },
  imported: { label: 'genehmigt', cls: 'approved' },
  rejected: { label: 'abgelehnt', cls: 'rejected' }
};

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const REQUEST_SEARCH_STATE_KEY = 'vanta.requests.searchState';

function loadRequestSearchState() {
  try {
    const raw = sessionStorage.getItem(REQUEST_SEARCH_STATE_KEY);
    return raw ? JSON.parse(raw) : { query: '', results: [] };
  } catch {
    return { query: '', results: [] };
  }
}

function saveRequestSearchState(query, results = []) {
  try {
    sessionStorage.setItem(REQUEST_SEARCH_STATE_KEY, JSON.stringify({ query, results }));
  } catch {
    // Ignore unavailable storage; search still works without restoration.
  }
}

function clearRequestSearchState() {
  try {
    sessionStorage.removeItem(REQUEST_SEARCH_STATE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

export default function RequestsPage(params = {}) {
  let debounceTimeout = null;
  let myRequests = [];
  let searchResults = [];
  let searchRunId = 0;
  const restoredSearchState = loadRequestSearchState();

  const container = createElement('div', { className: 'page-container content-section requests-page' });

  const pageHeader = createElement('div', { className: 'requests-page-header' },
    createElement('h1', { className: 'requests-page-title' }, 'Anfragen'),
    createElement('p', { className: 'requests-page-subtitle' }, 'Suche neue Titel oder verfolge den Status deiner bisherigen Anfragen.')
  );

  const choiceView = createElement('div', { className: 'requests-choice-view' });
  const newRequestBtn = createElement('button', {
    className: 'requests-choice-btn',
    onClick: () => {
      clearRequestSearchState();
      window.location.hash = '#/requests/new';
    }
  },
    createElement('span', { className: 'requests-choice-label' }, 'Neue Anfrage'),
    createElement('span', { className: 'requests-choice-copy' }, 'Film oder Serie suchen und direkt anfragen.')
  );
  const myRequestsBtn = createElement('button', {
    className: 'requests-choice-btn',
    onClick: () => { window.location.hash = '#/requests/mine'; }
  },
    createElement('span', { className: 'requests-choice-label' }, 'Meine Anfragen'),
    createElement('span', { className: 'requests-choice-copy' }, 'Status und Verlauf deiner Anfragen ansehen.')
  );
  choiceView.appendChild(newRequestBtn);
  choiceView.appendChild(myRequestsBtn);

  const newRequestSearchInput = createElement('input', {
    type: 'text',
    className: 'search-input-field',
    placeholder: 'Film oder Serie suchen...',
    onInput: (e) => {
      const query = e.target.value.trim();
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => performSearch(query), 450);
    },
    autocomplete: 'off'
  });
  const newRequestSearchWrapper = createElement('div', { className: 'search-input-wrapper' }, newRequestSearchInput);
  const newRequestResultsGrid = createElement('div', { className: 'requests-grid' });
  const newRequestLoading = createElement('div', { className: 'requests-search-loading hidden' },
    createSectionLoader({ label: 'Suche läuft...', compact: true })
  );
  const newRequestStatus = createElement('div', { className: 'search-empty-state' },
    createElement('h3', {}, 'Medien anfragen'),
    createElement('p', {}, 'Suche nach Filmen oder Serien und frage sie an.')
  );
  const newRequestBackBtn = createElement('button', {
    className: 'btn-secondary requests-back-btn',
    onClick: () => { window.location.hash = '#/requests'; }
  }, 'Zurück');
  const newRequestHeader = createElement('div', { className: 'requests-view-header' },
    newRequestBackBtn,
    createElement('div', { className: 'requests-view-copy' },
      createElement('h2', { className: 'requests-view-title' }, 'Neue Anfrage'),
      createElement('p', { className: 'requests-view-subtitle' }, 'Titel suchen, Verfügbarkeit prüfen und Anfrage starten.')
    )
  );
  const newRequestView = createElement('div', { className: 'requests-new-view hidden' },
    newRequestHeader,
    newRequestSearchWrapper,
    newRequestLoading,
    newRequestResultsGrid,
    newRequestStatus
  );

  const myRequestsSearchInput = createElement('input', {
    type: 'text',
    className: 'search-input-field',
    placeholder: 'Eigene Anfragen durchsuchen...',
    onInput: (e) => {
      const query = e.target.value.trim();
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => renderMyRequests(query), 250);
    },
    autocomplete: 'off'
  });
  const myRequestsSearchWrapper = createElement('div', { className: 'search-input-wrapper' }, myRequestsSearchInput);
  const myRequestsList = createElement('div', { className: 'my-requests-grid' });
  const myRequestsStatus = createElement('div', { className: 'search-empty-state' },
    createElement('h3', {}, 'Keine Anfragen'),
    createElement('p', {}, 'Du hast noch keine Medien angefragt.')
  );
  const myRequestsBackBtn = createElement('button', {
    className: 'btn-secondary requests-back-btn',
    onClick: () => { window.location.hash = '#/requests'; }
  }, 'Zurück');
  const myRequestsHeader = createElement('div', { className: 'requests-view-header' },
    myRequestsBackBtn,
    createElement('div', { className: 'requests-view-copy' },
      createElement('h2', { className: 'requests-view-title' }, 'Meine Anfragen'),
      createElement('p', { className: 'requests-view-subtitle' }, 'Prüfe, was noch offen ist und was bereits entschieden wurde.')
    )
  );
  const myRequestsView = createElement('div', { className: 'requests-list-view hidden' },
    myRequestsHeader,
    myRequestsSearchWrapper,
    myRequestsList,
    myRequestsStatus
  );

  container.appendChild(pageHeader);
  container.appendChild(choiceView);
  container.appendChild(newRequestView);
  container.appendChild(myRequestsView);

  const setView = (view) => {
    pageHeader.classList.toggle('hidden', view !== 'choice');
    choiceView.classList.toggle('hidden', view !== 'choice');
    newRequestView.classList.toggle('hidden', view !== 'new');
    myRequestsView.classList.toggle('hidden', view !== 'list');

    if (view === 'new') {
      const shouldRestoreSearch = Boolean(restoredSearchState.query);
      newRequestSearchInput.value = shouldRestoreSearch ? restoredSearchState.query : '';
      newRequestResultsGrid.innerHTML = '';
      newRequestLoading.classList.add('hidden');
      searchResults = Array.isArray(restoredSearchState.results) ? restoredSearchState.results : [];

      if (shouldRestoreSearch && searchResults.length > 0) {
        searchResults.forEach(item => {
          newRequestResultsGrid.appendChild(createSearchResultCard(item));
        });
        newRequestStatus.classList.add('hidden');
      } else if (shouldRestoreSearch) {
        newRequestStatus.innerHTML = '';
        newRequestStatus.appendChild(createElement('h3', {}, 'Keine Ergebnisse'));
        newRequestStatus.appendChild(createElement('p', {}, `Nichts gefunden für "${restoredSearchState.query}".`));
        newRequestStatus.classList.remove('hidden');
      } else {
        newRequestStatus.innerHTML = '';
        newRequestStatus.appendChild(createElement('h3', {}, 'Medien anfragen'));
        newRequestStatus.appendChild(createElement('p', {}, 'Suche nach Filmen oder Serien und frage sie an.'));
        newRequestStatus.classList.remove('hidden');
        setTimeout(() => newRequestSearchInput.focus(), 100);
      }
    }

    if (view === 'list') {
      myRequestsSearchInput.value = '';
      renderMyRequests();
    }
  };

  const performSearch = async (query) => {
    const runId = ++searchRunId;
    newRequestResultsGrid.innerHTML = '';
    searchResults = [];

    if (!query) {
      clearRequestSearchState();
      newRequestLoading.classList.add('hidden');
      setSectionBusy(newRequestResultsGrid, false);
      newRequestStatus.innerHTML = '';
      newRequestStatus.appendChild(createElement('h3', {}, 'Medien anfragen'));
      newRequestStatus.appendChild(createElement('p', {}, 'Suche nach Filmen oder Serien und frage sie an.'));
      newRequestStatus.classList.remove('hidden');
      return;
    }

    newRequestStatus.classList.add('hidden');
    newRequestLoading.classList.remove('hidden');
    setSectionBusy(newRequestResultsGrid, true);

    try {
      const data = await RequestsApi.search(query);
      if (runId !== searchRunId) return;

      searchResults = data || [];
      saveRequestSearchState(query, searchResults);
      newRequestResultsGrid.innerHTML = '';
      newRequestLoading.classList.add('hidden');

      if (searchResults.length === 0) {
        newRequestStatus.innerHTML = '';
        newRequestStatus.appendChild(createElement('h3', {}, 'Keine Ergebnisse'));
        newRequestStatus.appendChild(createElement('p', {}, `Nichts gefunden für "${query}".`));
        newRequestStatus.classList.remove('hidden');
      } else {
        searchResults.forEach(item => {
          newRequestResultsGrid.appendChild(createSearchResultCard(item));
        });
      }
    } catch (error) {
      if (runId !== searchRunId) return;
      if (error.isAuthError) {
        newRequestLoading.classList.add('hidden');
        return;
      }

      console.error('[Requests Search Error]', error);
      appStore.showToast('Suche fehlgeschlagen', 'error');
    } finally {
      if (runId === searchRunId) {
        newRequestLoading.classList.add('hidden');
        setSectionBusy(newRequestResultsGrid, false);
      }
    }
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

    const isDisabled = item.banned || item.exists || item.requested;

    const card = createElement('div', {
      className: `request-card request-card-clickable${isDisabled ? ' request-card-disabled' : ''}`,
      'data-tmdb-id': tmdbId,
      onClick: () => {
        if (isDisabled) return;
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

    const statusBadge = createElement('div', { className: 'request-card-status-row' });

    if (item.banned) {
      statusBadge.appendChild(createElement('span', { className: 'request-result-badge request-result-badge-error' }, 'Gebannt'));
    } else if (item.exists) {
      statusBadge.appendChild(createElement('span', { className: 'request-result-badge request-result-badge-available' }, 'In Mediathek verfügbar'));
    } else if (item.requested) {
      statusBadge.appendChild(createElement('span', { className: 'request-result-badge request-result-badge-requested' }, 'Bereits angefragt'));
    }

    if (statusBadge.children.length > 0) {
      info.appendChild(statusBadge);
    }

    card.appendChild(poster);
    card.appendChild(info);

    return card;
  };

  const loadMyRequests = async () => {
    myRequestsStatus.classList.add('hidden');
    myRequestsList.innerHTML = '';
    setSectionBusy(myRequestsList, true);
    myRequestsList.appendChild(createSectionLoader({ label: 'Anfragen werden geladen', compact: true }));

    try {
      myRequests = await RequestsApi.getMyRequests();
      if (!Array.isArray(myRequests)) myRequests = [];
    } catch (error) {
      console.warn('[My Requests Load Error]', error);
      myRequests = [];
    } finally {
      setSectionBusy(myRequestsList, false);
      renderMyRequests();
    }
  };

  const renderMyRequests = (query = '') => {
    const filtered = query
      ? myRequests.filter(req => (req.title || '').toLowerCase().includes(query.toLowerCase()))
      : myRequests;

    myRequestsList.innerHTML = '';

    if (filtered.length === 0) {
      myRequestsStatus.classList.remove('hidden');
      myRequestsStatus.innerHTML = '';
      myRequestsStatus.appendChild(createElement('h3', {}, query ? 'Keine Treffer' : 'Keine Anfragen'));
      myRequestsStatus.appendChild(createElement('p', {}, query
        ? `Keine Anfragen passen zu "${query}".`
        : 'Du hast noch keine Medien angefragt.'));
      return;
    }

    myRequestsStatus.classList.add('hidden');

    filtered.forEach(req => {
      const statusInfo = STATUS_MAP[req.status] || { label: req.status, cls: 'unknown' };
      const type = req.media_type === 'tv' ? 'Serie' : 'Film';
      const posterUrl = req.poster_path ? getTmdbImageUrl(req.poster_path) : null;
      const date = req.created_at ? new Date(req.created_at).toLocaleDateString('de-DE') : '-';

      const card = createElement('div', {
        className: 'request-card my-request-card',
        onClick: () => {
          window.location.hash = `#/request-detail/${req.tmdb_type}/${req.tmdb_id}`;
        }
      },
        createElement('div', { className: 'my-request-poster-wrap' },
          createElement('img', {
            className: 'request-card-poster',
            src: posterUrl || createPosterPlaceholder(req.title),
            alt: req.title,
            loading: 'lazy',
            onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.src = createPosterPlaceholder(req.title); }
          })
        ),
        createElement('div', { className: 'request-card-info' },
          createElement('div', { className: 'request-card-meta' },
            createElement('span', { className: 'request-card-type' }, type),
            createElement('span', { className: 'request-card-year' }, date)
          ),
          createElement('h3', { className: 'request-card-title' }, req.title),
          createElement('span', { className: `request-status request-status-${statusInfo.cls}` }, statusInfo.label)
        )
      );
      myRequestsList.appendChild(card);
    });
  };

  const initialView = params.view === 'new' || params.view === 'list' ? params.view : 'choice';
  setView(initialView);
  if (initialView === 'list') {
    loadMyRequests();
  }

  return container;
}
