import { createElement } from '../../../utils/dom.js';
import { MediaApi } from '../../../api/media.api.js';

export function itemTypeLabel(item) {
  if (item.Type === 'Movie') return 'Film';
  if (item.Type === 'Series') return 'Serie';
  if (item.Type === 'Episode') return 'Episode';
  return item.Type || 'Titel';
}

export function getPosterUrl(item) {
  const tag = item.ImageTags?.Primary || item.PrimaryImageTag;
  return MediaApi.getImageUrl(item.Id, 'Primary', 360, { tag, quality: 82 });
}

export function formatEpisodeCode(episode) {
  const season = String(episode.ParentIndexNumber || 1).padStart(2, '0');
  const index = String(episode.IndexNumber || 1).padStart(2, '0');
  return `S${season}E${index}`;
}

export function createDialogContext() {
  const ctx = {
    debounceTimer: null,
    searchRunId: 0,
    creating: false,
    currentView: 'pick-media',
    selectedSeries: null,
    open: false,
    lastFocusedElement: null
  };

  ctx.backButton = createElement('button', {
    className: 'watch-party-dialog-back',
    type: 'button',
    'aria-label': 'Zurück',
    hidden: true,
    onClick: () => ctx.handleBack()
  }, '←');

  ctx.titleEl = createElement('h2', { id: 'watch-party-dialog-title' }, 'Watch Party starten');

  ctx.closeButton = createElement('button', {
    className: 'watch-party-dialog-close',
    type: 'button',
    'aria-label': 'Schließen',
    onClick: () => ctx.setOpen(false)
  }, '×');

  ctx.searchInput = createElement('input', {
    className: 'watch-party-search-input',
    type: 'search',
    placeholder: 'Film oder Serie suchen …',
    'aria-label': 'Medium für die Watch Party suchen'
  });

  ctx.seasonTabs = createElement('div', { className: 'watch-party-season-tabs', hidden: true });
  ctx.resultsList = createElement('ul', { className: 'watch-party-results-list' });
  ctx.statusMessage = createElement('p', { className: 'watch-party-dialog-status', hidden: true }, '');

  ctx.dialog = createElement('div', {
    className: 'watch-party-dialog',
    role: 'dialog',
    tabindex: '-1',
    'aria-modal': 'true',
    'aria-labelledby': 'watch-party-dialog-title'
  },
    createElement('div', { className: 'watch-party-dialog-header' }, ctx.backButton, ctx.titleEl, ctx.closeButton),
    ctx.searchInput,
    ctx.seasonTabs,
    ctx.statusMessage,
    ctx.resultsList
  );

  ctx.backdrop = createElement('div', {
    className: 'watch-party-dialog-backdrop',
    'aria-hidden': 'true',
    onClick: event => {
      if (event.target === ctx.backdrop) ctx.setOpen(false);
    }
  }, ctx.dialog);

  ctx.setStatus = message => {
    ctx.statusMessage.textContent = message;
    ctx.statusMessage.hidden = !message;
  };

  return ctx;
}
