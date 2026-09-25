import { createElement } from '../utils/dom.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { notificationsStore } from '../store/notifications.store.js';
import { createSectionLoader } from '../components/loader.js';
import { createPosterPlaceholder } from '../utils/poster.js';
import {
  loadRequestSearchState, saveRequestSearchState, clearRequestSearchState, getTmdbImageUrl, getScopeLabel
} from './requests/helpers.js';

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>';

const STATUS = {
  pending: { label: 'Offen', chip: 'ui-chip-warning' },
  approved: { label: 'Genehmigt', chip: 'ui-chip-success' },
  imported: { label: 'Genehmigt', chip: 'ui-chip-success' },
  rejected: { label: 'Abgelehnt', chip: 'ui-chip-danger' }
};

const FILTERS = [
  { id: 'all', label: 'Alle', matches: () => true },
  { id: 'pending', label: 'Offen', matches: status => status === 'pending' },
  { id: 'approved', label: 'Genehmigt', matches: status => status === 'approved' || status === 'imported' },
  { id: 'rejected', label: 'Abgelehnt', matches: status => status === 'rejected' }
];

const poster = (path, title) => createElement('img', {
  className: 'request-poster',
  src: getTmdbImageUrl(path, 'w342') || createPosterPlaceholder(title),
  alt: '',
  loading: 'lazy',
  onError: event => { event.currentTarget.onerror = null; event.currentTarget.src = createPosterPlaceholder(title); }
});

// A search hit: poster with its state, title, type and year. Every hit opens
// its request page — also one that is (partly) in the library, where missing
// seasons can still be requested and a movie offers "Ansehen".
function resultCard(item) {
  const title = item.title || item.name || 'Unbekannt';
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const status = item.banned ? { label: 'Abgelehnt', chip: 'ui-chip-danger' }
    : item.exists ? { label: 'In Bibliothek', chip: 'ui-chip-success' }
      : item.requested ? { label: 'Angefragt', chip: 'ui-chip-warning' }
        : null;

  return createElement('a', {
    className: 'request-result',
    href: `#/request-detail/${item.media_type}/${item.id}`,
    'data-tmdb-id': item.id
  },
    createElement('div', { className: 'request-result-poster' },
      poster(item.poster_path, title),
      status ? createElement('span', { className: `ui-chip ${status.chip} request-result-status` }, status.label) : null
    ),
    createElement('strong', { className: 'request-result-title' }, title),
    createElement('span', { className: 'request-result-meta' }, [item.media_type === 'tv' ? 'Serie' : 'Film', year].filter(Boolean).join(' · '))
  );
}

function myRequestCard(request, isNew) {
  const status = STATUS[request.status] || { label: request.status, chip: 'ui-chip-muted' };
  const date = request.created_at ? new Date(request.created_at).toLocaleDateString('de-DE') : '';
  return createElement('a', {
    className: `request-mine${isNew ? ' is-new' : ''}`,
    href: `#/request-detail/${request.tmdb_type}/${request.tmdb_id}`
  },
    poster(request.poster_path, request.title),
    createElement('div', { className: 'request-mine-body' },
      createElement('div', { className: 'request-mine-head' },
        createElement('strong', {}, request.title),
        isNew ? createElement('span', { className: 'ui-chip ui-chip-accent' }, 'Neu') : null
      ),
      createElement('span', { className: 'ui-row-meta' },
        [request.tmdb_type === 'tv' ? 'Serie' : 'Film', getScopeLabel(request), date].filter(Boolean).join(' · ')),
      createElement('span', { className: `ui-chip ${status.chip}` }, status.label)
    )
  );
}

// "Anfragen": search TMDB for a missing title and request it, or follow the
// state of one's own requests.
export default function RequestsPage(params = {}) {
  const view = params.view === 'list' ? 'list' : 'new';

  const container = createElement('div', { className: 'page-container content-section' });
  const page = createElement('div', { className: 'ui-page requests-page' });
  container.appendChild(page);

  const mineDot = createElement('span', { className: 'ui-new-dot', hidden: true, 'aria-label': 'Neue Antworten' });
  const tab = (id, label, hash, ...extra) => createElement('button', {
    className: `ui-segment${view === id ? ' is-active' : ''}`,
    type: 'button',
    role: 'tab',
    'aria-selected': String(view === id),
    onClick: () => { window.location.hash = hash; }
  }, label, ...extra);

  page.append(
    createElement('header', { className: 'ui-heading' },
      createElement('h1', { className: 'ui-title' }, 'Anfragen'),
      createElement('p', { className: 'ui-subtitle' }, 'Fehlt ein Film, eine Serie oder eine Staffel? Frag sie an — und verfolge hier, was aus deinen Anfragen wird.')
    ),
    createElement('div', { className: 'ui-segmented requests-tabs', role: 'tablist', 'aria-label': 'Anfragen' },
      tab('new', 'Neu anfragen', '#/requests/new'),
      tab('list', 'Meine Anfragen', '#/requests/mine', mineDot)
    )
  );

  const unsubscribe = notificationsStore.subscribe(({ mine }) => { mineDot.hidden = view === 'list' || !mine.requests; });
  const stopWhenGone = () => {
    if (container.isConnected) return;
    unsubscribe();
    window.removeEventListener('hashchange', stopWhenGone);
  };
  window.addEventListener('hashchange', stopWhenGone);

  if (view === 'list') renderMine(page);
  else renderSearch(page);

  return container;
}

function renderSearch(page) {
  let debounce = null;
  let runId = 0;
  const restored = loadRequestSearchState();

  const grid = createElement('div', { className: 'request-grid' });
  const status = createElement('div', { className: 'ui-empty request-search-empty' });
  const loading = createElement('div', { className: 'request-search-loading', hidden: true }, createSectionLoader({ label: 'Suche läuft', compact: true }));

  const showIntro = () => {
    status.hidden = false;
    status.innerHTML = '';
    status.append(
      createElement('strong', {}, 'Was fehlt dir?'),
      'Suche nach einem Film oder einer Serie. Auch fehlende Staffeln oder einzelne Folgen einer Serie aus der Bibliothek kannst du anfragen.'
    );
  };

  const showResults = (query, results) => {
    grid.innerHTML = '';
    if (!results.length) {
      status.hidden = false;
      status.innerHTML = '';
      status.append(createElement('strong', {}, 'Nichts gefunden'), `Keine Treffer für „${query}“.`);
      return;
    }
    status.hidden = true;
    results.forEach(item => grid.appendChild(resultCard(item)));
  };

  const search = async query => {
    const run = ++runId;
    if (!query) {
      clearRequestSearchState();
      grid.innerHTML = '';
      loading.hidden = true;
      showIntro();
      return;
    }
    loading.hidden = false;
    status.hidden = true;
    try {
      const results = (await RequestsApi.search(query)) || [];
      if (run !== runId) return;
      saveRequestSearchState(query, results);
      showResults(query, results);
    } catch (error) {
      if (run !== runId || error.isAuthError) return;
      appStore.showToast('Suche fehlgeschlagen', 'error');
    } finally {
      if (run === runId) loading.hidden = true;
    }
  };

  const input = createElement('input', {
    type: 'search',
    placeholder: 'Film oder Serie suchen …',
    autocomplete: 'off',
    'aria-label': 'Film oder Serie suchen',
    onInput: () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => search(input.value.trim()), SEARCH_DEBOUNCE_MS);
    }
  });
  const icon = createElement('span', { 'aria-hidden': 'true' });
  icon.innerHTML = SEARCH_ICON;

  page.append(
    createElement('label', { className: 'ui-search request-search' }, icon, input),
    loading,
    status,
    grid
  );

  if (restored.query) {
    input.value = restored.query;
    showResults(restored.query, Array.isArray(restored.results) ? restored.results : []);
  } else {
    input.setAttribute('data-autofocus', '');
    showIntro();
  }
}

function renderMine(page) {
  let requests = [];
  let previousSeenAt = 0;
  let filter = 'all';

  const filterButtons = FILTERS.map(entry => createElement('button', {
    className: 'ui-segment',
    type: 'button',
    onClick: () => {
      filter = entry.id;
      render();
    }
  }, entry.label));
  const filters = createElement('div', { className: 'ui-segmented request-filters', role: 'group', 'aria-label': 'Status' }, ...filterButtons);
  const list = createElement('div', { className: 'request-mine-list' }, createSectionLoader({ label: 'Anfragen werden geladen', compact: true }));
  page.append(filters, list);

  function render() {
    filterButtons.forEach((button, index) => button.classList.toggle('is-active', FILTERS[index].id === filter));
    const matches = FILTERS.find(entry => entry.id === filter).matches;
    const visible = requests.filter(request => matches(request.status));
    list.innerHTML = '';
    if (!visible.length) {
      list.appendChild(createElement('div', { className: 'ui-empty' },
        createElement('strong', {}, requests.length ? 'Keine Anfragen mit diesem Status' : 'Noch keine Anfragen'),
        requests.length ? '' : 'Unter „Neu anfragen“ findest du Filme und Serien, die noch fehlen.'
      ));
      return;
    }
    visible.forEach(request => list.appendChild(myRequestCard(
      request,
      request.status !== 'pending' && Number(request.updated_at) > previousSeenAt
    )));
  }

  Promise.all([RequestsApi.getMyRequests(), notificationsStore.markSeen('requests')])
    .then(([loaded, seenAt]) => {
      requests = Array.isArray(loaded) ? loaded : [];
      previousSeenAt = seenAt;
      render();
    })
    .catch(error => {
      list.innerHTML = '';
      list.appendChild(createElement('div', { className: 'ui-empty' }, error.message || 'Anfragen konnten nicht geladen werden.'));
    });
}
