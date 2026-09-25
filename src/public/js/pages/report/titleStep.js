import { createElement } from '../../utils/dom.js';
import { MediaApi } from '../../api/media.api.js';
import { getItemImageUrl } from '../../utils/image.js';
import { iconElement } from './icons.js';

const SEARCH_DEBOUNCE_MS = 300;
const TYPE_LABEL = { Movie: 'Film', Series: 'Serie' };

export const describeItem = item =>
  [TYPE_LABEL[item.Type] || item.Type, item.ProductionYear].filter(Boolean).join(' · ');

export const posterThumb = (item, className = 'ui-thumb') => createElement('img', {
  className,
  src: getItemImageUrl(item, 'Primary'),
  alt: '',
  loading: 'lazy'
});

// Step 1: find the title in the library. Once picked, the step shrinks to the
// chosen title with an "Ändern" button.
export function createTitleStep({ onSelect }) {
  let debounce = null;
  let runId = 0;

  const results = createElement('div', { className: 'ui-list report-results' });
  const status = createElement('p', { className: 'ui-hint report-search-status' }, 'Suche nach dem Film oder der Serie mit dem Problem.');

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

  const searchBox = createElement('label', { className: 'ui-search' }, iconElement(createElement, 'search'), input);
  const picker = createElement('div', { className: 'report-picker' }, searchBox, status, results);
  const chosen = createElement('div', { className: 'report-chosen', hidden: true });
  const element = createElement('div', { className: 'report-title-step' }, picker, chosen);

  async function search(query) {
    const run = ++runId;
    results.innerHTML = '';
    if (query.length < 2) {
      status.textContent = 'Suche nach dem Film oder der Serie mit dem Problem.';
      return;
    }
    status.textContent = 'Suche …';
    try {
      const items = (await MediaApi.search(query)) || [];
      if (run !== runId) return;
      status.textContent = items.length ? '' : 'Nichts gefunden. Nur Titel aus deiner Bibliothek können gemeldet werden.';
      items.slice(0, 12).forEach(item => results.appendChild(createElement('button', {
        className: 'ui-row',
        type: 'button',
        onClick: () => onSelect(item)
      },
        posterThumb(item),
        createElement('span', { className: 'ui-row-text' },
          createElement('span', { className: 'ui-row-title' }, item.Name),
          createElement('span', { className: 'ui-row-meta' }, describeItem(item))
        )
      )));
    } catch {
      if (run === runId) status.textContent = 'Die Suche ist gerade nicht erreichbar.';
    }
  }

  const showChosen = item => {
    picker.hidden = Boolean(item);
    chosen.hidden = !item;
    chosen.innerHTML = '';
    if (!item) {
      window.requestAnimationFrame(() => input.focus());
      return;
    }
    chosen.append(
      posterThumb(item, 'ui-thumb report-chosen-thumb'),
      createElement('span', { className: 'ui-row-text' },
        createElement('span', { className: 'ui-row-title' }, item.Name),
        createElement('span', { className: 'ui-row-meta' }, describeItem(item))
      ),
      createElement('button', { className: 'ui-button ui-button-ghost', type: 'button', onClick: () => onSelect(null) }, 'Ändern')
    );
  };

  return { element, showChosen, focus: () => input.focus() };
}
