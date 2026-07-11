import { createElement } from '../../utils/dom.js';
import { MediaApi } from '../../api/media.api.js';
import { WatchPartyApi } from '../../api/watch-party.api.js';
import { appStore } from '../../store/app.store.js';

const SEARCH_DEBOUNCE_MS = 300;

function itemSubtitle(item) {
  if (item.Type === 'Episode') {
    const season = String(item.ParentIndexNumber || 1).padStart(2, '0');
    const episode = String(item.IndexNumber || 1).padStart(2, '0');
    return `${item.SeriesName || ''} · S${season}E${episode}`;
  }
  if (item.Type === 'Series') return 'Serie';
  if (item.Type === 'Movie') return item.ProductionYear ? String(item.ProductionYear) : 'Film';
  return item.Type || '';
}

export function createWatchPartyDialog() {
  let debounceTimer = null;
  let searchRunId = 0;
  let creating = false;

  const searchInput = createElement('input', {
    className: 'watch-party-search-input',
    type: 'search',
    placeholder: 'Film oder Serie suchen …',
    'aria-label': 'Medium für die Watch Party suchen'
  });

  const resultsList = createElement('ul', { className: 'watch-party-results-list' });

  const statusMessage = createElement('p', { className: 'watch-party-dialog-status' },
    'Suche nach einem Film oder einer Serie, um eine Watch Party zu starten.'
  );

  const closeButton = createElement('button', {
    className: 'watch-party-dialog-close',
    type: 'button',
    'aria-label': 'Schließen',
    onClick: () => setOpen(false)
  }, '×');

  const dialog = createElement('div', {
    className: 'watch-party-dialog',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'watch-party-dialog-title'
  },
    createElement('div', { className: 'watch-party-dialog-header' },
      createElement('h2', { id: 'watch-party-dialog-title' }, 'Watch Party starten'),
      closeButton
    ),
    searchInput,
    statusMessage,
    resultsList
  );

  const backdrop = createElement('div', {
    className: 'watch-party-dialog-backdrop',
    'aria-hidden': 'true',
    onClick: (event) => {
      if (event.target === backdrop) setOpen(false);
    }
  }, dialog);

  function renderResults(items) {
    resultsList.innerHTML = '';

    items.forEach(item => {
      const row = createElement('li', { className: 'watch-party-result-item' },
        createElement('button', {
          className: 'watch-party-result-button',
          type: 'button',
          disabled: creating,
          onClick: () => handleSelect(item)
        },
          createElement('span', { className: 'watch-party-result-title' }, item.Name || item.SeriesName || 'Unbenannt'),
          createElement('span', { className: 'watch-party-result-subtitle' }, itemSubtitle(item))
        )
      );
      resultsList.appendChild(row);
    });
  }

  function setStatus(message) {
    statusMessage.textContent = message;
    statusMessage.hidden = !message;
  }

  async function performSearch(query) {
    const runId = ++searchRunId;

    if (!query.trim()) {
      resultsList.innerHTML = '';
      setStatus('Suche nach einem Film oder einer Serie, um eine Watch Party zu starten.');
      return;
    }

    setStatus('Suche läuft …');

    try {
      const results = await MediaApi.search(query.trim());
      if (runId !== searchRunId) return;

      const playable = (results || []).filter(item => ['Movie', 'Series', 'Episode'].includes(item.Type));

      if (playable.length === 0) {
        resultsList.innerHTML = '';
        setStatus(`Keine Ergebnisse für "${query}".`);
        return;
      }

      setStatus('');
      renderResults(playable);
    } catch (error) {
      if (runId !== searchRunId) return;
      console.error('[Watch Party Search Error]', error);
      setStatus('Suche fehlgeschlagen. Bitte versuche es erneut.');
    }
  }

  async function handleSelect(item) {
    if (creating) return;
    creating = true;
    setStatus(`"${item.Name || item.SeriesName}" wird vorbereitet …`);
    resultsList.querySelectorAll('button').forEach(button => { button.disabled = true; });

    try {
      const { party } = await WatchPartyApi.create(item.Id);
      setOpen(false);
      window.location.hash = `#/watch-party/${party.id}`;
    } catch (error) {
      console.error('[Watch Party Create Error]', error);
      appStore.showToast(error.message || 'Watch Party konnte nicht erstellt werden', 'error');
      setStatus('Erstellung fehlgeschlagen. Bitte versuche es erneut.');
      resultsList.querySelectorAll('button').forEach(button => { button.disabled = false; });
    } finally {
      creating = false;
    }
  }

  searchInput.addEventListener('input', () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => performSearch(searchInput.value), SEARCH_DEBOUNCE_MS);
  });

  let open = false;
  let lastFocusedElement = null;

  function setOpen(nextOpen) {
    if (open === nextOpen) return;
    open = nextOpen;

    if (open) {
      lastFocusedElement = document.activeElement;
      backdrop.classList.add('open');
      backdrop.setAttribute('aria-hidden', 'false');
      searchInput.value = '';
      setStatus('Suche nach einem Film oder einer Serie, um eine Watch Party zu starten.');
      resultsList.innerHTML = '';
      window.requestAnimationFrame(() => searchInput.focus());
    } else {
      backdrop.classList.remove('open');
      backdrop.setAttribute('aria-hidden', 'true');
      window.clearTimeout(debounceTimer);
      lastFocusedElement?.focus?.();
      lastFocusedElement = null;
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) setOpen(false);
  });

  return {
    element: backdrop,
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => open
  };
}
