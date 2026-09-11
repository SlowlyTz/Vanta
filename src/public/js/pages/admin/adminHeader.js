import { createElement } from '../../utils/dom.js';
import { createTopbarIcon, createCloseIcon } from '../../components/navbar/icons.js';

const SEARCH_DEBOUNCE_MS = 150;

// Suchleiste eines Admin-Bereichs. Die Suche ist auf den Bereich beschränkt,
// in dem die Leiste steht — gefiltert wird im Bereich selbst (tool.setFilter),
// hier wird die Eingabe nur entprellt und nach außen gereicht.
export function createAdminHeader({ onSearch, placeholder = 'Suchen…', label = 'Suchen' } = {}) {
  let debounceTimer = null;

  const clearDebounce = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  const emitSearch = (term) => {
    onSearch?.(term.trim());
  };

  const updateClearVisibility = () => {
    clearButton.classList.toggle('hidden', searchInput.value.length === 0);
  };

  const searchInput = createElement('input', {
    className: 'admin-header-search-input',
    type: 'search',
    placeholder,
    'aria-label': label,
    onInput: () => {
      updateClearVisibility();
      clearDebounce();
      debounceTimer = setTimeout(() => emitSearch(searchInput.value), SEARCH_DEBOUNCE_MS);
    }
  });

  const clearButton = createElement('button', {
    className: 'admin-header-clear-button hidden',
    type: 'button',
    'aria-label': 'Suche leeren',
    onClick: () => {
      clearDebounce();
      searchInput.value = '';
      updateClearVisibility();
      searchInput.focus();
      emitSearch('');
    }
  }, createCloseIcon());

  const searchWrapper = createElement('div', {
    className: 'admin-header-search-wrapper',
    // The magnifier and the padding around the field are part of the hit area.
    onClick: () => searchInput.focus()
  },
    createTopbarIcon('search'),
    searchInput,
    clearButton
  );

  const element = createElement('div', { className: 'admin-header-bar' },
    searchWrapper
  );

  return {
    element,
    getTerm: () => searchInput.value.trim(),
    clear: () => {
      clearDebounce();
      searchInput.value = '';
      updateClearVisibility();
      emitSearch('');
    }
  };
}
