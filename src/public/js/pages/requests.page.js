import { createElement } from '../utils/dom.js';
import { RequestsApi } from '../api/requests.api.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { createPosterPlaceholder } from '../utils/poster.js';
import { PageHeading } from '../components/pageHeading.js';
import { STATUS_MAP, loadRequestSearchState, getTmdbImageUrl } from './requests/helpers.js';
import { bindSearch } from './requests/search.js';

export default function RequestsPage(params = {}) {
  const ctx = {
    debounceTimeout: null,
    myRequests: [],
    searchResults: [],
    searchRunId: 0
  };
  const restoredSearchState = loadRequestSearchState();

  const activeView = params.view === 'list' ? 'list' : 'new';

  const container = createElement('div', { className: 'page-container content-section requests-page' });

  const tabs = createElement('div', {
    className: 'requests-tabs',
    role: 'tablist',
    'aria-label': 'Anfragen'
  },
    createElement('button', {
      className: `requests-tab${activeView === 'new' ? ' active' : ''}`,
      type: 'button',
      role: 'tab',
      'aria-selected': String(activeView === 'new'),
      onClick: () => { window.location.hash = '#/requests/new'; }
    }, 'Neue Anfrage'),
    createElement('button', {
      className: `requests-tab${activeView === 'list' ? ' active' : ''}`,
      type: 'button',
      role: 'tab',
      'aria-selected': String(activeView === 'list'),
      onClick: () => { window.location.hash = '#/requests/mine'; }
    }, 'Meine Anfragen')
  );

  ctx.newRequestSearchInput = createElement('input', {
    type: 'text',
    className: 'search-input-field',
    placeholder: 'Film oder Serie suchen...',
    onInput: (e) => {
      const query = e.target.value.trim();
      if (ctx.debounceTimeout) clearTimeout(ctx.debounceTimeout);
      ctx.debounceTimeout = setTimeout(() => ctx.performSearch(query), 450);
    },
    autocomplete: 'off'
  });
  const newRequestSearchWrapper = createElement('div', { className: 'search-input-wrapper' }, ctx.newRequestSearchInput);
  ctx.newRequestResultsGrid = createElement('div', { className: 'requests-grid' });
  ctx.newRequestLoading = createElement('div', { className: 'requests-search-loading hidden' },
    createSectionLoader({ label: 'Suche läuft...', compact: true })
  );
  ctx.newRequestStatus = createElement('div', { className: 'search-empty-state' },
    createElement('h3', {}, 'Medien anfragen'),
    createElement('p', {}, 'Suche nach Filmen oder Serien und frage sie an.')
  );
  const newRequestView = createElement('div', {
    className: `requests-new-view${activeView === 'new' ? '' : ' hidden'}`
  },
    newRequestSearchWrapper,
    ctx.newRequestLoading,
    ctx.newRequestResultsGrid,
    ctx.newRequestStatus
  );

  const myRequestsSearchInput = createElement('input', {
    type: 'text',
    className: 'search-input-field',
    placeholder: 'Eigene Anfragen durchsuchen...',
    onInput: (e) => {
      const query = e.target.value.trim();
      if (ctx.debounceTimeout) clearTimeout(ctx.debounceTimeout);
      ctx.debounceTimeout = setTimeout(() => renderMyRequests(query), 250);
    },
    autocomplete: 'off'
  });
  const myRequestsSearchWrapper = createElement('div', { className: 'search-input-wrapper' }, myRequestsSearchInput);
  const myRequestsList = createElement('div', { className: 'my-requests-grid' });
  const myRequestsStatus = createElement('div', { className: 'search-empty-state' },
    createElement('h3', {}, 'Keine Anfragen'),
    createElement('p', {}, 'Du hast noch keine Medien angefragt.')
  );
  const myRequestsView = createElement('div', {
    className: `requests-list-view${activeView === 'list' ? '' : ' hidden'}`
  },
    myRequestsSearchWrapper,
    myRequestsList,
    myRequestsStatus
  );

  container.appendChild(PageHeading({
    title: 'Anfragen',
    subtitle: 'Suche neue Titel oder verfolge den Status deiner bisherigen Anfragen.'
  }));
  container.appendChild(tabs);
  container.appendChild(newRequestView);
  container.appendChild(myRequestsView);

  bindSearch(ctx);

  const loadMyRequests = async () => {
    myRequestsStatus.classList.add('hidden');
    myRequestsList.innerHTML = '';
    setSectionBusy(myRequestsList, true);
    myRequestsList.appendChild(createSectionLoader({ label: 'Anfragen werden geladen', compact: true }));

    try {
      ctx.myRequests = await RequestsApi.getMyRequests();
      if (!Array.isArray(ctx.myRequests)) ctx.myRequests = [];
    } catch (error) {
      console.warn('[My Requests Load Error]', error);
      ctx.myRequests = [];
    } finally {
      setSectionBusy(myRequestsList, false);
      renderMyRequests();
    }
  };

  const renderMyRequests = (query = '') => {
    const filtered = query
      ? ctx.myRequests.filter(req => (req.title || '').toLowerCase().includes(query.toLowerCase()))
      : ctx.myRequests;

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

  if (activeView === 'new') {
    const shouldRestoreSearch = Boolean(restoredSearchState.query);
    ctx.newRequestSearchInput.value = shouldRestoreSearch ? restoredSearchState.query : '';
    ctx.searchResults = Array.isArray(restoredSearchState.results) ? restoredSearchState.results : [];

    if (shouldRestoreSearch && ctx.searchResults.length > 0) {
      ctx.searchResults.forEach(item => {
        ctx.newRequestResultsGrid.appendChild(ctx.createSearchResultCard(item));
      });
      ctx.newRequestStatus.classList.add('hidden');
    } else if (shouldRestoreSearch) {
      ctx.newRequestStatus.innerHTML = '';
      ctx.newRequestStatus.appendChild(createElement('h3', {}, 'Keine Ergebnisse'));
      ctx.newRequestStatus.appendChild(createElement('p', {}, `Nichts gefunden für "${restoredSearchState.query}".`));
    } else {
      setTimeout(() => ctx.newRequestSearchInput.focus(), 100);
    }
  }

  if (activeView === 'list') {
    loadMyRequests();
  }

  return container;
}
