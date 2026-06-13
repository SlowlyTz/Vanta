import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { MediaCard } from '../components/mediaCard.js';
import { appStore } from '../store/app.store.js';

export default function SearchPage() {
  let debounceTimeout = null;

  const container = createElement('div', { className: 'page-container content-section' });

  const resultsGrid = createElement('div', { className: 'grid-container' });
  const statusContainer = createElement('div', { className: 'search-empty-state' },
    createElement('h3', {}, 'Finde deine Lieblingsinhalte'),
    createElement('p', {}, 'Tippe den Namen eines Films oder einer Serie in das Suchfeld oben ein.')
  );

  const performSearch = async (query) => {
    if (!query) {
      resultsGrid.innerHTML = '';
      statusContainer.innerHTML = '';
      statusContainer.appendChild(createElement('h3', {}, 'Finde deine Lieblingsinhalte'));
      statusContainer.appendChild(createElement('p', {}, 'Tippe den Namen eines Films oder einer Serie in das Suchfeld oben ein.'));
      statusContainer.classList.remove('hidden');
      return;
    }

    statusContainer.classList.add('hidden');
    appStore.setLoading(true);

    try {
      const results = await MediaApi.search(query);
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
      console.error('[Search Page Error]', error);
      appStore.showToast('Fehler bei der Suche', 'error');
      statusContainer.innerHTML = '';
      statusContainer.appendChild(createElement('h3', {}, 'Suche fehlgeschlagen'));
      statusContainer.appendChild(createElement('p', {}, error.message));
      statusContainer.classList.remove('hidden');
    } finally {
      appStore.setLoading(false);
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
    onInput: handleInput,
    autocomplete: 'off'
  });

  // Safe autofocus hook
  setTimeout(() => {
    try {
      searchInput.focus();
    } catch (_) {}
  }, 100);

  const searchWrapper = createElement('div', { className: 'search-container' },
    createElement('div', { className: 'search-input-wrapper' }, searchInput),
    resultsGrid,
    statusContainer
  );

  container.appendChild(searchWrapper);
  return container;
}
