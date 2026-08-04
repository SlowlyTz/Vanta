import { createElement } from '../../utils/dom.js';
import { createTopbarIcon, createCloseIcon, createSettingsGearIcon } from '../../components/navbar/icons.js';

const SEARCH_DEBOUNCE_MS = 150;

// Kopfzeile der Admin-Seite: eine globale Suchleiste über Nutzer und Anfragen,
// rechts daneben der Zahnrad-Button fürs Einstellungen-Panel. Die eigentliche
// Such- und Panel-Logik lebt in adminSearch.js / adminSettingsPanel.js — hier
// wird nur die Eingabe entprellt und nach außen gereicht.
export function createAdminHeader({ onSearch, onToggleSettings }) {
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
    placeholder: 'Nutzer oder Anfragen suchen…',
    'aria-label': 'Nutzer oder Anfragen suchen',
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

  const searchWrapper = createElement('div', { className: 'admin-header-search-wrapper' },
    createTopbarIcon('search'),
    searchInput,
    clearButton
  );

  const settingsButton = createElement('button', {
    className: 'admin-header-settings-button',
    type: 'button',
    'aria-label': 'Admin-Einstellungen',
    'aria-expanded': 'false',
    onClick: () => onToggleSettings?.()
  }, createSettingsGearIcon());

  const element = createElement('div', { className: 'admin-header-bar' },
    searchWrapper,
    settingsButton
  );

  return {
    element,
    getTerm: () => searchInput.value.trim(),
    clear: () => {
      clearDebounce();
      searchInput.value = '';
      updateClearVisibility();
      emitSearch('');
    },
    setSettingsOpen: (isOpen) => {
      settingsButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      settingsButton.classList.toggle('admin-header-settings-button-active', Boolean(isOpen));
    }
  };
}
