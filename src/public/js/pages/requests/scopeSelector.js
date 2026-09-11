import { createElement } from '../../utils/dom.js';
import { RequestsApi } from '../../api/requests.api.js';
import { appStore } from '../../store/app.store.js';
import { createSectionLoader } from '../../components/loader.js';
import {
  getScopeLabel,
  isScopeCovered,
  addScopeToCoverage,
  buildRequestCoverage,
  getTmdbImageUrl
} from './helpers.js';

const MODES = [
  { id: 'all', label: 'Komplette Serie' },
  { id: 'season', label: 'Einzelne Staffeln' },
  { id: 'episode', label: 'Einzelne Folge' }
];

const withType = target => ({ ...target, tmdbType: 'tv' });

// Scope picker for series: whole show, one or more seasons, or a single
// episode. Every entry of `seasons` is the merged shape from mergeSeasons().
export function createRequestScopeSelector({
  tmdbId,
  seasons = [],
  coverage = null,
  seriesExists = false,
  banned = false,
  onCreated = null
} = {}) {
  const cover = coverage || buildRequestCoverage([]);
  const hasSeasons = seasons.length > 0;
  const episodeSeasons = seasons.filter(season => !season.special);
  const wholeSeriesBlocked = banned || cover.all || seriesExists;

  const state = {
    mode: wholeSeriesBlocked && hasSeasons ? 'season' : 'all',
    selectedSeasons: new Set(),
    selectedEpisode: null,
    expandedSeason: null,
    episodes: new Map(),
    busy: false,
    feedback: null
  };

  const modesRow = createElement('div', {
    className: 'request-scope-modes',
    role: 'group',
    'aria-label': 'Umfang der Anfrage'
  });
  const modeButtons = new Map();
  const panel = createElement('div', { className: 'request-scope-panel' });
  const submitButton = createElement('button', {
    className: 'btn-primary request-scope-submit',
    type: 'button',
    onClick: () => { submit(); }
  }, 'Anfragen');
  const hint = createElement('p', { className: 'request-scope-hint', 'aria-live': 'polite' });
  const actions = createElement('div', { className: 'request-scope-actions' }, submitButton, hint);

  const element = createElement('div', { className: 'content-section request-scope-section' },
    createElement('h3', { className: 'request-detail-section-title' }, 'Anfrage stellen'),
    modesRow,
    panel,
    actions
  );

  const seasonCovered = seasonNumber => isScopeCovered(cover, { scope: 'season', seasonNumber });
  const episodeCovered = (seasonNumber, episodeNumber) =>
    isScopeCovered(cover, { scope: 'episode', seasonNumber, episodeNumber });

  const setMode = mode => {
    if (state.mode === mode) return;
    state.mode = mode;
    state.feedback = null;
    render();
  };

  const markSelected = (button, selected) => {
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  };

  // Toggling touches only the clicked button, so the panel keeps its scroll
  // position and the button keeps focus.
  const toggleSeason = (seasonNumber, button) => {
    const selected = !state.selectedSeasons.has(seasonNumber);
    if (selected) state.selectedSeasons.add(seasonNumber);
    else state.selectedSeasons.delete(seasonNumber);

    markSelected(button, selected);
    renderActions();
  };

  const selectEpisode = (seasonNumber, episodeNumber, button) => {
    const current = state.selectedEpisode;
    const selected = !(current && current.seasonNumber === seasonNumber && current.episodeNumber === episodeNumber);

    panel.querySelectorAll('.request-scope-episode.selected').forEach(el => markSelected(el, false));
    state.selectedEpisode = selected ? { seasonNumber, episodeNumber } : null;

    markSelected(button, selected);
    renderActions();
  };

  const loadEpisodes = async seasonNumber => {
    state.episodes.set(seasonNumber, { status: 'loading', items: [] });
    render();

    try {
      const data = await RequestsApi.getSeason(tmdbId, seasonNumber);
      const items = Array.isArray(data?.episodes) ? data.episodes : [];
      state.episodes.set(seasonNumber, { status: 'ready', items });
    } catch (error) {
      if (error?.isAuthError) return;
      state.episodes.set(seasonNumber, {
        status: 'error',
        items: [],
        message: error?.message || 'Folgen konnten nicht geladen werden.'
      });
    }

    render();
  };

  // Rebuilding the panel drops the toggle that was clicked, so hand focus back
  // to its replacement when nothing else has taken it.
  const restoreToggleFocus = seasonNumber => {
    if (document.activeElement && document.activeElement !== document.body) return;
    panel.querySelector(`.request-scope-season-toggle[data-season-number="${seasonNumber}"]`)?.focus();
  };

  const toggleSeasonExpansion = seasonNumber => {
    if (state.expandedSeason === seasonNumber) {
      state.expandedSeason = null;
      render();
      restoreToggleFocus(seasonNumber);
      return;
    }

    state.expandedSeason = seasonNumber;
    const cached = state.episodes.get(seasonNumber);
    if (!cached || cached.status === 'error') loadEpisodes(seasonNumber);
    else render();
    restoreToggleFocus(seasonNumber);
  };

  const buildTargets = () => {
    if (state.mode === 'all') return [{ scope: 'all' }];
    if (state.mode === 'season') {
      return Array.from(state.selectedSeasons)
        .sort((a, b) => a - b)
        .map(seasonNumber => ({ scope: 'season', seasonNumber }));
    }
    return state.selectedEpisode ? [{ scope: 'episode', ...state.selectedEpisode }] : [];
  };

  const describeFailure = failure =>
    `${getScopeLabel(withType(failure.target))} (${failure.error?.message || 'Fehler'})`;

  const reportResult = (created, failed, total) => {
    if (created.length > 0 && failed.length === 0) {
      const text = created.length === 1
        ? `„${getScopeLabel(withType(created[0]))}“ angefragt`
        : `${created.length} Anfragen erstellt`;
      state.feedback = { type: 'success', text };
      appStore.showToast(text, 'success');
      return;
    }

    // A 401 already redirects to the login route; a toast on top of that is noise.
    if (failed.every(failure => failure.error?.isAuthError)) {
      state.feedback = null;
      return;
    }

    const text = created.length > 0
      ? `${created.length} von ${total} Anfragen erstellt. Fehlgeschlagen: ${failed.map(describeFailure).join(', ')}`
      : failed.map(describeFailure).join(', ') || 'Anfrage fehlgeschlagen';

    state.feedback = { type: 'error', text };
    appStore.showToast(text, 'error');
  };

  const submit = async () => {
    const targets = buildTargets();
    // Der deaktivierte Knopf ist die Anzeige, nicht die Sperre.
    if (banned || state.busy || targets.length === 0) return;

    state.busy = true;
    state.feedback = null;
    render();

    // Nacheinander, nicht parallel: jede Anfrage lässt den Server die Staffel
    // gegen TMDB prüfen, und zehn gleichzeitige Anfragen wären zehn Bündel
    // TMDB-Aufrufe auf einmal.
    const results = [];
    for (const target of targets) {
      try {
        results.push({ status: 'fulfilled', value: await RequestsApi.createRequest(tmdbId, 'tv', '', target) });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }
    }

    const created = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        created.push(targets[index]);
        addScopeToCoverage(cover, targets[index]);
      } else {
        failed.push({ target: targets[index], error: result.reason });
      }
    });

    created.forEach(target => {
      if (target.scope === 'season') state.selectedSeasons.delete(target.seasonNumber);
      if (target.scope === 'episode') state.selectedEpisode = null;
    });

    state.busy = false;
    reportResult(created, failed, targets.length);
    if (created.length > 0) onCreated?.(created);
    render();
  };

  const buildModes = () => {
    // Season and episode scopes need a season list; without one only 'all' is
    // left and the switcher would be a single dead button.
    if (!hasSeasons) return;

    MODES.forEach(mode => {
      const button = createElement('button', {
        className: 'request-scope-mode',
        type: 'button',
        'data-scope': mode.id,
        'aria-pressed': 'false',
        onClick: () => setMode(mode.id)
      }, mode.label);

      modeButtons.set(mode.id, button);
      modesRow.appendChild(button);
    });
  };

  const syncModes = () => {
    modeButtons.forEach((button, id) => {
      const active = state.mode === id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const renderAllPanel = () => {
    let note = 'Es werden alle Staffeln der Serie angefragt.';
    if (banned) note = 'Dieser Titel wurde abgelehnt und kann nicht angefragt werden.';
    else if (cover.all) note = 'Die komplette Serie ist bereits angefragt.';
    else if (seriesExists) note = 'Die Serie ist bereits in der Bibliothek. Frage einzelne Staffeln oder Folgen an.';

    panel.appendChild(createElement('p', { className: 'request-scope-note' }, note));
  };

  const renderSeasonEntry = season => {
    const covered = seasonCovered(season.season_number);
    const disabled = banned || covered || !season.requestable;
    const selected = state.selectedSeasons.has(season.season_number);
    const posterUrl = getTmdbImageUrl(season.poster_path, 'w185');

    let stateLabel = null;
    if (season.special) stateLabel = 'Specials';
    else if (season.exists) stateLabel = 'In Bibliothek';
    else if (covered) stateLabel = 'Angefragt';

    return createElement('button', {
      className: `request-scope-season${selected ? ' selected' : ''}`,
      type: 'button',
      'data-season-number': season.season_number,
      'aria-pressed': String(selected),
      disabled,
      onClick: event => toggleSeason(season.season_number, event.currentTarget)
    },
      posterUrl
        ? createElement('img', {
          className: 'request-scope-season-poster',
          src: posterUrl,
          alt: '',
          loading: 'lazy',
          onError: e => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }
        })
        : null,
      createElement('span', { className: 'request-scope-season-body' },
        createElement('span', { className: 'request-scope-season-name' }, season.name),
        createElement('span', { className: 'request-scope-season-meta' }, `${season.episode_count} Folgen`),
        stateLabel ? createElement('span', { className: 'request-scope-season-state' }, stateLabel) : null
      )
    );
  };

  const renderSeasonPanel = () => {
    if (!hasSeasons) {
      panel.appendChild(createElement('p', { className: 'request-scope-note' }, 'Keine Staffeldaten verfügbar.'));
      return;
    }

    const grid = createElement('div', { className: 'request-scope-season-grid' });
    seasons.forEach(season => grid.appendChild(renderSeasonEntry(season)));
    panel.appendChild(grid);
  };

  const renderEpisodeList = seasonNumber => {
    const entry = state.episodes.get(seasonNumber);

    if (!entry || entry.status === 'loading') {
      return createElement('div', { className: 'request-scope-episodes' },
        createSectionLoader({ label: 'Folgen werden geladen', compact: true })
      );
    }

    if (entry.status === 'error') {
      return createElement('div', { className: 'request-scope-episodes' },
        createElement('p', { className: 'request-scope-note request-scope-note-error' }, entry.message),
        createElement('button', {
          className: 'btn-secondary request-scope-episodes-retry',
          type: 'button',
          onClick: () => loadEpisodes(seasonNumber)
        }, 'Erneut versuchen')
      );
    }

    if (entry.items.length === 0) {
      return createElement('div', { className: 'request-scope-episodes' },
        createElement('p', { className: 'request-scope-note' }, 'Keine Folgen gefunden.')
      );
    }

    const list = createElement('div', { className: 'request-scope-episodes' });

    entry.items.forEach(episode => {
      const episodeNumber = Number(episode.episode_number);
      const covered = episodeCovered(seasonNumber, episodeNumber);
      const selected = Boolean(state.selectedEpisode
        && state.selectedEpisode.seasonNumber === seasonNumber
        && state.selectedEpisode.episodeNumber === episodeNumber);

      list.appendChild(createElement('button', {
        className: `request-scope-episode${selected ? ' selected' : ''}`,
        type: 'button',
        'data-season-number': seasonNumber,
        'data-episode-number': episodeNumber,
        'aria-pressed': String(selected),
        disabled: banned || covered,
        onClick: event => selectEpisode(seasonNumber, episodeNumber, event.currentTarget)
      },
        createElement('span', { className: 'request-scope-episode-number' },
          getScopeLabel({ scope: 'episode', seasonNumber, episodeNumber })),
        createElement('span', { className: 'request-scope-episode-name' }, episode.name || 'Ohne Titel'),
        covered ? createElement('span', { className: 'request-scope-season-state' }, 'Angefragt') : null
      ));
    });

    return list;
  };

  const renderEpisodePanel = () => {
    if (episodeSeasons.length === 0) {
      panel.appendChild(createElement('p', { className: 'request-scope-note' }, 'Keine Staffeldaten verfügbar.'));
      return;
    }

    const list = createElement('div', { className: 'request-scope-episode-seasons' });

    episodeSeasons.forEach(season => {
      const expanded = state.expandedSeason === season.season_number;
      list.appendChild(createElement('div', { className: 'request-scope-episode-season' },
        createElement('button', {
          className: `request-scope-season-toggle${expanded ? ' expanded' : ''}`,
          type: 'button',
          'data-season-number': season.season_number,
          'aria-expanded': String(expanded),
          onClick: () => toggleSeasonExpansion(season.season_number)
        },
          createElement('span', { className: 'request-scope-season-name' }, season.name),
          createElement('span', { className: 'request-scope-season-meta' }, `${season.episode_count} Folgen`)
        ),
        expanded ? renderEpisodeList(season.season_number) : null
      ));
    });

    panel.appendChild(list);
  };

  const submitState = () => {
    if (banned) return { disabled: true, label: 'Anfragen', hint: 'Dieser Titel wurde abgelehnt.' };

    if (state.mode === 'all') {
      if (cover.all) return { disabled: true, label: 'Komplette Serie anfragen', hint: 'Bereits angefragt.' };
      if (seriesExists) return { disabled: true, label: 'Komplette Serie anfragen', hint: 'Bereits in der Bibliothek.' };
      return { disabled: false, label: 'Komplette Serie anfragen', hint: '' };
    }

    if (state.mode === 'season') {
      const count = state.selectedSeasons.size;
      return {
        disabled: count === 0,
        label: count > 1 ? `${count} Staffeln anfragen` : 'Staffel anfragen',
        hint: count === 0 ? 'Wähle mindestens eine Staffel.' : ''
      };
    }

    return {
      disabled: !state.selectedEpisode,
      label: 'Folge anfragen',
      hint: state.selectedEpisode ? '' : 'Wähle eine Folge aus.'
    };
  };

  const renderActions = () => {
    const { disabled, label, hint: hintText } = submitState();

    submitButton.textContent = state.busy ? 'Wird angefragt...' : label;
    submitButton.disabled = disabled || state.busy;
    if (state.busy) submitButton.setAttribute('aria-busy', 'true');
    else submitButton.removeAttribute('aria-busy');

    hint.textContent = state.feedback ? state.feedback.text : hintText;
    hint.className = `request-scope-hint${state.feedback?.type === 'error' ? ' request-scope-hint-error' : ''}`;
  };

  function render() {
    syncModes();

    panel.innerHTML = '';
    if (state.mode === 'season') renderSeasonPanel();
    else if (state.mode === 'episode') renderEpisodePanel();
    else renderAllPanel();

    renderActions();
  }

  buildModes();
  render();

  return { element, render };
}
