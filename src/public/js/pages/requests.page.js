import { createElement } from '../utils/dom.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { createPosterPlaceholder } from '../utils/poster.js';

const STATUS_MAP = {
  pending: { label: 'ausstehend', cls: 'pending' },
  approved: { label: 'genehmigt', cls: 'approved' },
  imported: { label: 'genehmigt', cls: 'approved' },
  rejected: { label: 'abgelehnt', cls: 'rejected' }
};

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export default function RequestsPage() {
  let debounceTimeout = null;
  let myRequests = [];
  let searchResults = [];
  let searchRunId = 0;

  const container = createElement('div', { className: 'page-container content-section requests-page' });

  const pageTitle = createElement('h1', { className: 'requests-page-title' }, 'Anfragen');

  const choiceView = createElement('div', { className: 'requests-choice-view' });
  const newRequestBtn = createElement('button', {
    className: 'requests-choice-btn',
    onClick: () => setView('new')
  }, 'Neue Anfrage');
  const myRequestsBtn = createElement('button', {
    className: 'requests-choice-btn',
    onClick: () => {
      loadMyRequests();
      setView('list');
    }
  }, 'Meine Anfragen');
  choiceView.appendChild(newRequestBtn);
  choiceView.appendChild(myRequestsBtn);

  const newRequestSearchInput = createElement('input', {
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
  const newRequestSearchWrapper = createElement('div', { className: 'search-input-wrapper' }, newRequestSearchInput);
  const newRequestResultsGrid = createElement('div', { className: 'requests-grid' });
  const newRequestStatus = createElement('div', { className: 'search-empty-state' },
    createElement('h3', {}, 'Medien anfragen'),
    createElement('p', {}, 'Suche nach Filmen oder Serien und frage sie an.')
  );
  const newRequestBackBtn = createElement('button', {
    className: 'btn-secondary requests-back-btn',
    onClick: () => setView('choice')
  }, 'Zurueck');
  const newRequestView = createElement('div', { className: 'requests-new-view hidden' },
    newRequestBackBtn,
    newRequestSearchWrapper,
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
    onClick: () => setView('choice')
  }, 'Zurueck');
  const myRequestsView = createElement('div', { className: 'requests-list-view hidden' },
    myRequestsBackBtn,
    myRequestsSearchWrapper,
    myRequestsList,
    myRequestsStatus
  );

  container.appendChild(pageTitle);
  container.appendChild(choiceView);
  container.appendChild(newRequestView);
  container.appendChild(myRequestsView);

  const setView = (view) => {
    choiceView.classList.toggle('hidden', view !== 'choice');
    newRequestView.classList.toggle('hidden', view !== 'new');
    myRequestsView.classList.toggle('hidden', view !== 'list');

    if (view === 'new') {
      newRequestSearchInput.value = '';
      newRequestResultsGrid.innerHTML = '';
      newRequestStatus.innerHTML = '';
      newRequestStatus.appendChild(createElement('h3', {}, 'Medien anfragen'));
      newRequestStatus.appendChild(createElement('p', {}, 'Suche nach Filmen oder Serien und frage sie an.'));
      newRequestStatus.classList.remove('hidden');
      setTimeout(() => newRequestSearchInput.focus(), 100);
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
      appStore.setLoading(false);
      newRequestStatus.innerHTML = '';
      newRequestStatus.appendChild(createElement('h3', {}, 'Medien anfragen'));
      newRequestStatus.appendChild(createElement('p', {}, 'Suche nach Filmen oder Serien und frage sie an.'));
      newRequestStatus.classList.remove('hidden');
      return;
    }

    newRequestStatus.classList.add('hidden');
    appStore.setLoading(true);

    try {
      const data = await RequestsApi.search(query);
      if (runId !== searchRunId) return;

      searchResults = data || [];
      newRequestResultsGrid.innerHTML = '';

      if (searchResults.length === 0) {
        newRequestStatus.innerHTML = '';
        newRequestStatus.appendChild(createElement('h3', {}, 'Keine Ergebnisse'));
        newRequestStatus.appendChild(createElement('p', {}, `Nichts gefunden fuer "${query}".`));
        newRequestStatus.classList.remove('hidden');
      } else {
        searchResults.forEach(item => {
          newRequestResultsGrid.appendChild(createSearchResultCard(item));
        });
      }
    } catch (error) {
      if (runId !== searchRunId) return;
      if (error.isAuthError) {
        appStore.setLoading(false);
        return;
      }

      console.error('[Requests Search Error]', error);
      appStore.showToast('Suche fehlgeschlagen', 'error');
    } finally {
      appStore.setLoading(false);
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

    const actions = createElement('div', { className: 'request-card-actions' });

    if (item.banned) {
      actions.appendChild(createElement('span', {
        className: 'btn-request-error',
        style: 'cursor: default;'
      }, 'Gebannt'));
    } else if (item.exists) {
      actions.appendChild(createElement('span', {
        className: 'search-available-badge',
        style: 'color: var(--color-primary); font-size: 0.85rem; cursor: default;'
      }, 'In Mediathek verfuegbar'));
    } else if (item.requested) {
      actions.appendChild(createElement('span', { className: 'btn-requested', style: 'cursor: default;' }, 'Bereits angefragt'));
    } else {
      const requestBtn = createElement('button', {
        className: 'btn-primary request-card-btn',
        onClick: (e) => {
          e.stopPropagation();
          window.location.hash = `#/request-detail/${tmdbType}/${tmdbId}`;
        }
      }, 'Anfragen');
      actions.appendChild(requestBtn);
    }

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

  return container;
}
