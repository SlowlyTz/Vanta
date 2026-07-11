import { createElement } from '../../utils/dom.js';
import { MediaApi } from '../../api/media.api.js';
import { WatchPartyApi } from '../../api/watch-party.api.js';
import { appStore } from '../../store/app.store.js';

const SEARCH_DEBOUNCE_MS = 300;

function itemTypeLabel(item) {
  if (item.Type === 'Movie') return 'Film';
  if (item.Type === 'Series') return 'Serie';
  if (item.Type === 'Episode') return 'Episode';
  return item.Type || 'Titel';
}

function getPosterUrl(item) {
  const tag = item.ImageTags?.Primary || item.PrimaryImageTag;
  return MediaApi.getImageUrl(item.Id, 'Primary', 360, { tag, quality: 82 });
}

function formatEpisodeCode(episode) {
  const season = String(episode.ParentIndexNumber || 1).padStart(2, '0');
  const index = String(episode.IndexNumber || 1).padStart(2, '0');
  return `S${season}E${index}`;
}

export function createWatchPartyDialog() {
  let debounceTimer = null;
  let searchRunId = 0;
  let creating = false;
  let currentView = 'pick-media';
  let selectedSeries = null;

  const backButton = createElement('button', {
    className: 'watch-party-dialog-back',
    type: 'button',
    'aria-label': 'Zurück',
    hidden: true,
    onClick: () => handleBack()
  }, '←');

  const titleEl = createElement('h2', { id: 'watch-party-dialog-title' }, 'Watch Party starten');

  const closeButton = createElement('button', {
    className: 'watch-party-dialog-close',
    type: 'button',
    'aria-label': 'Schließen',
    onClick: () => setOpen(false)
  }, '×');

  const searchInput = createElement('input', {
    className: 'watch-party-search-input',
    type: 'search',
    placeholder: 'Film oder Serie suchen …',
    'aria-label': 'Medium für die Watch Party suchen'
  });

  const seasonTabs = createElement('div', { className: 'watch-party-season-tabs', hidden: true });
  const resultsList = createElement('ul', { className: 'watch-party-results-list' });
  const statusMessage = createElement('p', { className: 'watch-party-dialog-status', hidden: true }, '');

  const dialog = createElement('div', {
    className: 'watch-party-dialog',
    role: 'dialog',
    tabindex: '-1',
    'aria-modal': 'true',
    'aria-labelledby': 'watch-party-dialog-title'
  },
    createElement('div', { className: 'watch-party-dialog-header' }, backButton, titleEl, closeButton),
    searchInput,
    seasonTabs,
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

  function setStatus(message) {
    statusMessage.textContent = message;
    statusMessage.hidden = !message;
  }

  function renderCards(items) {
    resultsList.innerHTML = '';
    resultsList.className = 'watch-party-card-grid';

    if (!items.length) {
      resultsList.appendChild(createElement('li', { className: 'watch-party-empty-state' }, 'Keine Ergebnisse gefunden.'));
      return;
    }

    items.forEach(item => {
      const card = createElement('li', { className: 'watch-party-card-item' },
        createElement('button', {
          className: 'watch-party-card',
          type: 'button',
          disabled: creating,
          onClick: () => handleSelect(item)
        },
          createElement('div', { className: 'watch-party-card-poster' },
            createElement('img', { src: getPosterUrl(item), alt: '', loading: 'lazy' }),
            createElement('span', { className: 'watch-party-card-badge' }, itemTypeLabel(item))
          ),
          createElement('span', { className: 'watch-party-card-title' }, item.Name || item.SeriesName || 'Unbenannt'),
          createElement('span', { className: 'watch-party-card-meta' }, item.ProductionYear ? String(item.ProductionYear) : '')
        )
      );
      resultsList.appendChild(card);
    });
  }

  async function loadSuggestions() {
    const runId = ++searchRunId;
    setStatus('Vorschläge werden geladen …');
    resultsList.innerHTML = '';

    try {
      const { items } = await WatchPartyApi.suggestions(18);
      if (runId !== searchRunId) return;
      setStatus(items.length ? '' : 'Keine Vorschläge verfügbar.');
      renderCards(items);
    } catch (error) {
      if (runId !== searchRunId) return;
      console.error('[Watch Party Suggestions Error]', error);
      setStatus('Vorschläge konnten nicht geladen werden.');
    }
  }

  async function performSearch(query) {
    const runId = ++searchRunId;

    if (!query.trim()) {
      loadSuggestions();
      return;
    }

    setStatus('Suche läuft …');
    resultsList.innerHTML = '';

    try {
      const results = await MediaApi.search(query.trim());
      if (runId !== searchRunId) return;

      const playable = (results || []).filter(item => ['Movie', 'Series', 'Episode'].includes(item.Type));
      setStatus(playable.length ? '' : `Keine Ergebnisse für "${query}".`);
      renderCards(playable);
    } catch (error) {
      if (runId !== searchRunId) return;
      console.error('[Watch Party Search Error]', error);
      setStatus('Suche fehlgeschlagen. Bitte versuche es erneut.');
    }
  }

  function showPickMediaView() {
    currentView = 'pick-media';
    titleEl.textContent = 'Watch Party starten';
    backButton.hidden = true;
    searchInput.hidden = false;
    seasonTabs.hidden = true;
    seasonTabs.innerHTML = '';
    searchInput.value = '';
    loadSuggestions();
    window.requestAnimationFrame(() => searchInput.focus());
  }

  function renderSeasonTabs(seasons) {
    seasonTabs.innerHTML = '';
    seasonTabs.hidden = seasons.length <= 1;

    seasons.forEach((season, index) => {
      const tab = createElement('button', {
        className: `watch-party-season-tab${index === 0 ? ' active' : ''}`,
        type: 'button',
        onClick: (event) => {
          seasonTabs.querySelectorAll('.watch-party-season-tab').forEach(el => el.classList.remove('active'));
          event.currentTarget.classList.add('active');
          loadSeasonEpisodes(selectedSeries.Id, season.Id);
        }
      }, season.Name || `Staffel ${season.IndexNumber ?? index + 1}`);
      seasonTabs.appendChild(tab);
    });
  }

  function renderEpisodeCards(episodes) {
    resultsList.innerHTML = '';
    resultsList.className = 'watch-party-episode-list';

    if (!episodes.length) {
      resultsList.appendChild(createElement('li', { className: 'watch-party-empty-state' }, 'Keine Folgen in dieser Staffel.'));
      return;
    }

    episodes.forEach(episode => {
      resultsList.appendChild(createElement('li', { className: 'watch-party-episode-item' },
        createElement('button', {
          className: 'watch-party-episode-button',
          type: 'button',
          disabled: creating,
          onClick: () => createPartyForItem(episode.Id)
        },
          createElement('span', { className: 'watch-party-episode-index' }, formatEpisodeCode(episode)),
          createElement('span', { className: 'watch-party-episode-title' }, episode.Name || 'Unbenannte Folge')
        )
      ));
    });
  }

  async function loadSeasonEpisodes(seriesId, seasonId) {
    setStatus('Folgen werden geladen …');
    resultsList.innerHTML = '';

    try {
      const episodes = await MediaApi.getEpisodes(seriesId, seasonId);
      setStatus('');
      renderEpisodeCards(episodes || []);
    } catch (error) {
      console.error('[Watch Party Episodes Error]', error);
      setStatus('Folgen konnten nicht geladen werden.');
    }
  }

  async function showEpisodePicker(series) {
    currentView = 'pick-episode';
    selectedSeries = series;
    titleEl.textContent = series.Name || 'Episode wählen';
    backButton.hidden = false;
    searchInput.hidden = true;
    setStatus('Staffeln werden geladen …');
    resultsList.innerHTML = '';
    seasonTabs.innerHTML = '';
    seasonTabs.hidden = true;

    try {
      const seasons = await MediaApi.getSeasons(series.Id);
      if (!seasons?.length) {
        setStatus('Keine Staffeln für diese Serie gefunden.');
        return;
      }

      renderSeasonTabs(seasons);
      await loadSeasonEpisodes(series.Id, seasons[0].Id);
    } catch (error) {
      console.error('[Watch Party Episode Picker Error]', error);
      setStatus('Episoden konnten nicht geladen werden.');
    }
  }

  function handleBack() {
    if (currentView === 'pick-episode') showPickMediaView();
  }

  async function handleSelect(item) {
    if (item.Type === 'Series') {
      await showEpisodePicker(item);
      return;
    }
    await createPartyForItem(item.Id);
  }

  async function createPartyForItem(itemId) {
    if (creating) return;
    creating = true;
    setStatus('Watch Party wird vorbereitet …');
    resultsList.querySelectorAll('button').forEach(button => { button.disabled = true; });

    try {
      const { party } = await WatchPartyApi.create(itemId);
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

  function showResumeChoice(snapshot) {
    currentView = 'resume-choice';
    titleEl.textContent = 'Watch Party starten';
    backButton.hidden = true;
    searchInput.hidden = true;
    seasonTabs.hidden = true;
    setStatus('');
    resultsList.innerHTML = '';
    resultsList.className = 'watch-party-choice-list';

    resultsList.appendChild(
      createElement('li', { className: 'watch-party-choice-item' },
        createElement('button', {
          className: 'watch-party-choice-button',
          type: 'button',
          onClick: () => showPickMediaView()
        },
          createElement('span', { className: 'watch-party-choice-title' }, 'Neue Party starten'),
          createElement('span', { className: 'watch-party-choice-meta' }, 'Film oder Serie auswählen')
        )
      )
    );

    resultsList.appendChild(
      createElement('li', { className: 'watch-party-choice-item' },
        createElement('button', {
          className: 'watch-party-choice-button',
          type: 'button',
          onClick: () => handleResume(snapshot)
        },
          createElement('span', { className: 'watch-party-choice-title' }, 'Letzte Party fortsetzen'),
          createElement('span', { className: 'watch-party-choice-meta' }, snapshot.itemSnapshot?.name || '')
        )
      )
    );
  }

  async function handleResume(snapshot) {
    if (creating) return;
    creating = true;
    setStatus('Watch Party wird fortgesetzt …');
    resultsList.querySelectorAll('button').forEach(button => { button.disabled = true; });

    try {
      const { party } = await WatchPartyApi.resume(snapshot.originalPartyId);
      setOpen(false);
      window.location.hash = `#/watch-party/${party.id}`;
    } catch (error) {
      console.error('[Watch Party Resume Error]', error);
      appStore.showToast(error.message || 'Watch Party konnte nicht fortgesetzt werden', 'error');
      showPickMediaView();
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

  async function setOpen(nextOpen) {
    if (open === nextOpen) return;
    open = nextOpen;

    if (open) {
      lastFocusedElement = document.activeElement;
      backdrop.classList.add('open');
      backdrop.setAttribute('aria-hidden', 'false');

      try {
        const { party: snapshot } = await WatchPartyApi.resumable();
        if (!open) return;
        if (snapshot) showResumeChoice(snapshot);
        else showPickMediaView();
      } catch (error) {
        console.error('[Watch Party Resumable Check Error]', error);
        if (open) showPickMediaView();
      }
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
