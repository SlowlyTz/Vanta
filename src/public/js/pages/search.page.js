import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { MediaCard } from '../components/mediaCard.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';

export default function SearchPage() {
  let debounceTimeout = null;
  let searchRunId = 0;

  const getQueryFromHash = () => {
    const [, queryString = ''] = window.location.hash.split('?');
    return new URLSearchParams(queryString).get('q') || '';
  };

  const initialQuery = getQueryFromHash();
  const container = createElement('div', { className: 'page-container content-section search-page' });

  const resultsGrid = createElement('div', { className: 'grid-container' });
  const statusContainer = createElement('div', { className: 'search-empty-state' },
    createElement('h3', {}, 'Finde deine Lieblingsinhalte'),
    createElement('p', {}, 'Tippe den Namen eines Films oder einer Serie in das Suchfeld ein.')
  );

  const performSearch = async (query) => {
    const runId = ++searchRunId;

    if (!query) {
      resultsGrid.innerHTML = '';
      setSectionBusy(resultsGrid, false);
      statusContainer.innerHTML = '';
      statusContainer.appendChild(createElement('h3', {}, 'Finde deine Lieblingsinhalte'));
      statusContainer.appendChild(createElement('p', {}, 'Tippe den Namen eines Films oder einer Serie in das Suchfeld ein.'));
      statusContainer.classList.remove('hidden');
      return;
    }

    statusContainer.classList.add('hidden');
    resultsGrid.innerHTML = '';
    setSectionBusy(resultsGrid, true);
    resultsGrid.appendChild(createSectionLoader({ label: `Suche nach "${query}"...` }));

    try {
      const results = await MediaApi.search(query);
      if (runId !== searchRunId) return;

      resultsGrid.innerHTML = '';

      if (results.length === 0) {
        statusContainer.innerHTML = '';
        statusContainer.appendChild(createElement('h3', {}, 'Keine Ergebnisse gefunden'));
        statusContainer.appendChild(createElement('p', {}, `Für "${query}" konnten keine Ergebnisse geladen werden.`));
        statusContainer.classList.remove('hidden');
      } else {
        results.forEach(item => {
          const cardEl = MediaCard({ item, landscape: false });
          if (cardEl) resultsGrid.appendChild(cardEl);
        });
      }
    } catch (error) {
      if (runId !== searchRunId) return;
      if (error.isAuthError) return;

      console.error('[Search Page Error]', error);
      appStore.showToast('Fehler bei der Suche', 'error');
      resultsGrid.innerHTML = '';
      statusContainer.innerHTML = '';
      statusContainer.appendChild(createElement('h3', {}, 'Suche fehlgeschlagen'));
      statusContainer.appendChild(createElement('p', {}, error.message));
      statusContainer.classList.remove('hidden');
    } finally {
      if (runId === searchRunId) {
        setSectionBusy(resultsGrid, false);
      }
    }
  };

  const handleInput = (e) => {
    const query = e.target.value.trim();

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(() => {
      performSearch(query);
    }, 450);
  };

  const searchInput = createElement('input', {
    type: 'text',
    className: 'search-input-field',
    placeholder: 'Filme oder Serien suchen...',
    value: initialQuery,
    onInput: handleInput,
    autocomplete: 'off'
  });

  if (!initialQuery) {
    setTimeout(() => {
      if (!window.matchMedia('(max-width: 768px)').matches) return;
      try {
        searchInput.focus();
      } catch (_) {}
    }, 100);
  }

  const searchWrapper = createElement('div', { className: 'search-container' },
    createElement('div', { className: 'search-input-wrapper' }, searchInput),
    resultsGrid,
    statusContainer
  );

  container.appendChild(searchWrapper);
  if (initialQuery) {
    performSearch(initialQuery);
  }
  return container;
}
