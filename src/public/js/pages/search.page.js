// Search page: titles and people with filters, state kept in the hash; on a TV
// split into keyboard and results zones.
import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { MediaCard } from '../components/mediaCard.js';
import { CastCarousel } from '../components/castCarousel.js';
import { appStore } from '../store/app.store.js';
import { resolvePageScope } from '../utils/pageScope.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { createActorModal } from './detail/actorModal.js';
import { recentSearches } from '../utils/recentSearches.js';
import { createOnScreenKeyboard } from '../components/tv/OnScreenKeyboard.js';
import { genreLabel } from '../shared/genreLabels.js';
import { TV_BACK_EVENT } from '../tv/back.js';

const SEARCH_DELAY_MS = 450;

const TYPE_OPTIONS = [
  { value: '', label: 'Alle' },
  { value: 'Movie', label: 'Filme' },
  { value: 'Series', label: 'Serien' }
];

const DECADE_OPTIONS = [
  { value: '', label: 'Alle' },
  { value: '2020', label: '2020er' },
  { value: '2010', label: '2010er' },
  { value: '2000', label: '2000er' },
  { value: '1990', label: '1990er' },
  { value: '1980', label: '1980er' },
  { value: '1970', label: '1970er' },
  { value: '1960', label: 'Älter' }
];

const FSK_OPTIONS = [
  { value: '', label: 'Alle' },
  { value: '0', label: 'FSK 0' },
  { value: '6', label: 'bis 6' },
  { value: '12', label: 'bis 12' },
  { value: '16', label: 'bis 16' },
  { value: '18', label: 'bis 18' }
];

// What the search shows, from the hash (#/search?q=…&type=…&genre=a,b&decade=…&fsk=…&unwatched=1),
// so "Zurück" from a title lands on the same search.
export function readSearchState(hash = window.location.hash) {
  const [, queryString = ''] = hash.split('?');
  const params = new URLSearchParams(queryString);
  return {
    q: params.get('q') || '',
    type: ['Movie', 'Series'].includes(params.get('type')) ? params.get('type') : '',
    genre: (params.get('genre') || '').split(',').map(part => part.trim()).filter(Boolean),
    decade: params.get('decade') || '',
    fsk: params.get('fsk') ?? '',
    unwatched: params.get('unwatched') === '1'
  };
}

export function searchStateToHash(state) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.type) params.set('type', state.type);
  if (state.genre.length) params.set('genre', state.genre.join(','));
  if (state.decade) params.set('decade', state.decade);
  if (state.fsk !== '') params.set('fsk', state.fsk);
  if (state.unwatched) params.set('unwatched', '1');
  const query = params.toString();
  return query ? `#/search?${query}` : '#/search';
}

const activeFilterCount = (state) =>
  (state.type ? 1 : 0) + state.genre.length + (state.decade ? 1 : 0) + (state.fsk !== '' ? 1 : 0) + (state.unwatched ? 1 : 0);

export default function SearchPage(params, pageScope) {
  const scope = resolvePageScope(pageScope);
  const { signal } = scope;
  const state = readSearchState();
  let debounceTimeout = null;
  let searchRunId = 0;
  const actorModal = createActorModal({ currentItemId: null });

  const container = createElement('div', { className: 'page-container content-section search-page' },
    createElement('h1', { className: 'visually-hidden' }, 'Suche'));
  const peopleSlot = createElement('div', { className: 'search-people' });
  const resultsGrid = createElement('div', { className: 'grid-container', id: 'search-results' });
  // Tells screen readers how a search went; the grid alone says nothing.
  const resultCount = createElement('p', { className: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
  const statusContainer = createElement('div', { className: 'search-empty-state' });
  const recentSlot = createElement('div', { className: 'search-recent' });

  const hasCriteria = () => Boolean(state.q) || activeFilterCount(state) > 0;

  // The hash follows the search without a new history entry per keystroke.
  const syncHash = () => {
    const next = searchStateToHash(state);
    if (window.location.hash !== next) window.history.replaceState(window.history.state, '', next);
  };

  const showStatus = (title, message) => {
    statusContainer.replaceChildren(...[createElement('h3', {}, title), message ? createElement('p', {}, message) : null].filter(Boolean));
    statusContainer.classList.remove('hidden');
  };

  const renderRecent = () => {
    const list = recentSearches.list();
    recentSlot.replaceChildren();
    recentSlot.hidden = hasCriteria() || list.length === 0;
    if (recentSlot.hidden) return;
    const chips = list.map(entry => createElement('span', { className: 'search-recent-chip' },
      createElement('button', {
        type: 'button',
        className: 'search-recent-text',
        onClick: () => {
          searchInput.value = entry;
          state.q = entry;
          recentSearches.add(entry);
          update();
        }
      }, entry),
      createElement('button', {
        type: 'button',
        className: 'search-recent-remove',
        'aria-label': `„${entry}“ aus den letzten Suchen entfernen`,
        onClick: () => {
          recentSearches.remove(entry);
          renderRecent();
        }
      }, '×')
    ));
    recentSlot.append(
      createElement('div', { className: 'search-recent-head' },
        createElement('h2', { className: 'search-recent-title' }, 'Letzte Suchen'),
        createElement('button', {
          type: 'button',
          className: 'search-recent-clear',
          onClick: () => {
            recentSearches.clear();
            renderRecent();
          }
        }, 'Alle löschen')
      ),
      createElement('div', { className: 'search-recent-list' }, chips)
    );
  };

  // A newer search cancels the request of the one before.
  let runController = null;
  signal.addEventListener?.('abort', () => runController?.abort(), { once: true });
  const performSearch = async () => {
    const runId = ++searchRunId;
    runController?.abort();
    runController = new AbortController();
    const runSignal = runController.signal;
    peopleSlot.replaceChildren();

    if (!hasCriteria()) {
      resultsGrid.innerHTML = '';
      setSectionBusy(resultsGrid, false);
      resultCount.textContent = '';
      showStatus('Finde deine Lieblingsinhalte', document.documentElement.classList.contains('tv-mode')
        ? 'Gib den Namen eines Films, einer Serie oder einer Person mit der Tastatur links ein.'
        : 'Tippe den Namen eines Films, einer Serie oder einer Person in das Suchfeld ein.');
      renderRecent();
      return;
    }

    renderRecent();
    statusContainer.classList.add('hidden');
    resultsGrid.innerHTML = '';
    setSectionBusy(resultsGrid, true);
    resultsGrid.appendChild(createSectionLoader({ label: state.q ? `Suche nach „${state.q}“ …` : 'Titel werden gesucht …' }));

    try {
      const { items = [], people = [] } = await MediaApi.searchFull(state.q, state, { signal: runSignal });
      if (runId !== searchRunId) return;

      resultsGrid.innerHTML = '';
      const label = state.q ? ` für „${state.q}“` : '';
      resultCount.textContent = items.length === 0 ? `Keine Treffer${label}` : `${items.length} Treffer${label}`;

      if (people.length > 0) {
        const carousel = CastCarousel({ actors: people, title: 'Personen', onActorClick: person => {
          if (state.q) recentSearches.add(state.q);
          actorModal.openActorModal(person);
        } });
        if (carousel) peopleSlot.appendChild(carousel);
      }

      if (items.length === 0) {
        showStatus(`Keine Treffer${label}`, activeFilterCount(state)
          ? 'Mit diesen Filtern gibt es keine Treffer. Lockere die Filter oder ändere die Suche.'
          : 'Versuch es mit einem anderen Titel oder einem Namen.');
      } else {
        items.forEach(item => {
          const cardEl = MediaCard({ item, landscape: false, sourceType: 'search' });
          if (cardEl) resultsGrid.appendChild(cardEl);
        });
      }
    } catch (error) {
      if (runId !== searchRunId || error.name === 'AbortError') return;
      if (error.isAuthError) return;

      console.error('[Search Page Error]', error);
      appStore.showToast('Fehler bei der Suche', 'error');
      resultsGrid.innerHTML = '';
      showStatus('Suche fehlgeschlagen', error.message);
    } finally {
      if (runId === searchRunId) {
        setSectionBusy(resultsGrid, false);
      }
    }
  };

  const update = ({ immediate = true } = {}) => {
    syncHash();
    filterButtonCount.textContent = activeFilterCount(state) ? String(activeFilterCount(state)) : '';
    if (debounceTimeout) clearTimeout(debounceTimeout);
    if (immediate) performSearch();
    else debounceTimeout = setTimeout(performSearch, SEARCH_DELAY_MS);
  };

  const searchInput = createElement('input', {
    type: 'search',
    className: 'search-input-field',
    placeholder: 'Filme, Serien oder Personen suchen …',
    'aria-label': 'Filme, Serien oder Personen suchen',
    'aria-controls': 'search-results',
    enterkeyhint: 'search',
    value: state.q,
    autocomplete: 'off',
    'data-autofocus': !state.q,
    onInput: (event) => {
      state.q = event.target.value.trim();
      update({ immediate: false });
    },
    onKeydown: (event) => {
      if (event.key !== 'Enter') return;
      if (state.q) recentSearches.add(state.q);
      update();
    }
  });

  // A click on a result keeps the search in "Letzte Suchen".
  resultsGrid.addEventListener('click', (event) => {
    if (event.target.closest('.media-card') && state.q) recentSearches.add(state.q);
  });

  // --- Filters --------------------------------------------------------------
  const filterButtonCount = createElement('span', { className: 'search-filter-count', 'aria-hidden': 'true' });
  const filterPanel = createElement('div', { className: 'search-filters', id: 'search-filters', hidden: activeFilterCount(state) === 0 });
  const filterButton = createElement('button', {
    type: 'button',
    className: 'search-filter-toggle',
    'aria-expanded': String(!filterPanel.hidden),
    'aria-controls': 'search-filters',
    onClick: () => {
      filterPanel.hidden = !filterPanel.hidden;
      filterButton.setAttribute('aria-expanded', String(!filterPanel.hidden));
    }
  }, 'Filter', filterButtonCount);

  // TV: Back closes an open filter panel before it leaves the page.
  scope.listen(window, TV_BACK_EVENT, event => {
    if (filterPanel.hidden) return;
    event.preventDefault();
    filterPanel.hidden = true;
    filterButton.setAttribute('aria-expanded', 'false');
    filterButton.focus({ preventScroll: true });
  });

  const chipGroup = ({ label, options, isActive, onPick, multiple = false }) => {
    const group = createElement('div', { className: 'search-filter-chips', role: multiple ? 'group' : 'radiogroup', 'aria-label': label });
    const render = () => {
      group.querySelectorAll('.search-filter-chip').forEach(chip => {
        const active = isActive(chip.dataset.value);
        chip.classList.toggle('is-active', active);
        chip.setAttribute(multiple ? 'aria-pressed' : 'aria-checked', String(active));
      });
    };
    options.forEach(option => {
      group.appendChild(createElement('button', {
        type: 'button',
        className: 'search-filter-chip',
        role: multiple ? null : 'radio',
        dataset: { value: option.value },
        onClick: () => {
          onPick(option.value);
          render();
          update();
        }
      }, option.label));
    });
    render();
    return { element: group, render };
  };

  const field = (label, control) => createElement('div', { className: 'search-filter-field' },
    createElement('span', { className: 'search-filter-label' }, label), control);

  const typeChips = chipGroup({ label: 'Typ', options: TYPE_OPTIONS, isActive: value => state.type === value, onPick: value => { state.type = value; } });
  const decadeChips = chipGroup({ label: 'Jahrzehnt', options: DECADE_OPTIONS, isActive: value => state.decade === value, onPick: value => { state.decade = value; } });
  // Only decades the library has titles from ("Älter" for anything before
  // the 1970s); without an answer all stay.
  MediaApi.getDecades?.()
    .then(({ decades } = {}) => {
      if (!Array.isArray(decades)) return;
      const present = new Set(decades.map(String));
      const older = decades.some(decade => decade <= 1960);
      decadeChips.element.querySelectorAll('[data-value]').forEach(chip => {
        const value = chip.dataset.value;
        if (!value || value === state.decade) return;
        chip.hidden = value === '1960' ? !older : !present.has(value);
      });
    })
    .catch(() => {});
  const fskChips = chipGroup({ label: 'Altersfreigabe', options: FSK_OPTIONS, isActive: value => state.fsk === value, onPick: value => { state.fsk = value; } });
  const genreSlot = createElement('div', { className: 'search-filter-chips' }, createElement('span', { className: 'search-filter-hint' }, 'Genres werden geladen …'));

  const unwatchedToggle = createElement('input', {
    type: 'checkbox',
    checked: state.unwatched,
    onChange: (event) => {
      state.unwatched = event.target.checked;
      update();
    }
  });

  const resetButton = createElement('button', {
    type: 'button',
    className: 'search-filter-reset',
    onClick: () => {
      Object.assign(state, { type: '', genre: [], decade: '', fsk: '', unwatched: false });
      unwatchedToggle.checked = false;
      [typeChips, decadeChips, fskChips, genreChips].forEach(group => group?.render());
      update();
    }
  }, 'Filter zurücksetzen');

  let genreChips = null;
  MediaApi.getGenres('Movie,Series')
    .then(genres => {
      const names = (genres || []).map(genre => genre.Name).filter(Boolean);
      genreChips = chipGroup({
        label: 'Genres',
        multiple: true,
        options: names.map(name => ({ value: name, label: genreLabel(name) })),
        isActive: value => state.genre.includes(value),
        onPick: value => {
          state.genre = state.genre.includes(value) ? state.genre.filter(entry => entry !== value) : [...state.genre, value];
        }
      });
      genreSlot.replaceWith(genreChips.element);
    })
    .catch(() => genreSlot.replaceChildren(createElement('span', { className: 'search-filter-hint' }, 'Genres konnten nicht geladen werden.')));

  filterPanel.append(
    field('Typ', typeChips.element),
    field('Genres', genreSlot),
    field('Jahrzehnt', decadeChips.element),
    field('Altersfreigabe', fskChips.element),
    createElement('label', { className: 'search-filter-switch' }, unwatchedToggle, createElement('span', {}, 'Nur ungesehene')),
    resetButton
  );

  const searchWrapper = createElement('div', { className: 'search-container' },
    createElement('div', { className: 'search-input-wrapper', role: 'search' }, searchInput),
    createElement('div', { className: 'search-filter-bar' }, filterButton),
    filterPanel,
    recentSlot,
    resultCount,
    peopleSlot,
    resultsGrid,
    statusContainer
  );

  // TV: two zones. Left the field, the on-screen keyboard under it, then
  // filters and recent searches; right the results, which up/down move
  // through (a column) and left leaves for the keyboard again.
  if (document.documentElement.classList.contains('tv-mode')) {
    const keyboard = createOnScreenKeyboard({ input: searchInput, shift: false });
    // The field shows what is typed; the remote types with the keys below it.
    searchInput.setAttribute('tabindex', '-1');
    const inputWrapper = searchWrapper.querySelector('.search-input-wrapper');
    const filterBar = searchWrapper.querySelector('.search-filter-bar');
    const panel = createElement('div', { className: 'tv-search-keyboard', 'data-osk-inline': '', 'data-tv-group': 'keyboard' },
      inputWrapper, keyboard.element, filterBar, filterPanel, recentSlot);
    const results = createElement('div', { className: 'tv-search-results', 'data-tv-group': 'results', 'data-tv-column': '', 'data-tv-backdrop': '' },
      resultCount, peopleSlot, resultsGrid, statusContainer);
    container.classList.add('is-tv-search');
    panel.querySelector('.osk-key')?.setAttribute('data-tv-autofocus', '');
    container.append(panel, results);
    filterButtonCount.textContent = activeFilterCount(state) ? String(activeFilterCount(state)) : '';
    scope.onLeave?.(() => { if (debounceTimeout) clearTimeout(debounceTimeout); });
    performSearch();
    return container;
  }

  container.appendChild(searchWrapper);
  filterButtonCount.textContent = activeFilterCount(state) ? String(activeFilterCount(state)) : '';
  scope.onLeave?.(() => { if (debounceTimeout) clearTimeout(debounceTimeout); });
  performSearch();
  return container;
}
