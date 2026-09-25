import { createElement } from '../../utils/dom.js';
import { RequestsApi } from '../../api/requests.api.js';
import { appStore } from '../../store/app.store.js';
import { isScopeCovered, addScopeToCoverage, buildRequestCoverage, getTmdbImageUrl } from './helpers.js';

const MODES = [
  { id: 'all', label: 'Komplette Serie' },
  { id: 'season', label: 'Staffeln' },
  { id: 'episode', label: 'Folgen' }
];

const CHECK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>';
const CHEVRON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg>';

const html = (className, markup) => {
  const element = createElement('span', { className, 'aria-hidden': 'true' });
  element.innerHTML = markup;
  return element;
};

const formatDate = value => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const isUpcoming = episode => episode.air_date && new Date(episode.air_date) > new Date();

// Status of one season against the library and the open requests.
export function seasonState(season, cover) {
  if (season.special) return { key: 'special', label: 'Specials', chip: 'ui-chip-muted', selectable: false };
  if (season.complete) return { key: 'library', label: 'In Bibliothek', chip: 'ui-chip-success', selectable: false };
  if (isScopeCovered(cover, { scope: 'season', seasonNumber: season.season_number })) {
    return { key: 'requested', label: 'Angefragt', chip: 'ui-chip-warning', selectable: false };
  }
  if (season.exists && season.availableEpisodes.length) {
    const total = season.episode_count || '?';
    return { key: 'partial', label: `Teilweise · ${season.availableEpisodes.length}/${total}`, chip: 'ui-chip-accent', selectable: true };
  }
  return { key: 'missing', label: 'Fehlt', chip: 'ui-chip-muted', selectable: true };
}

// Picks what to request of a series: the whole series, some seasons, or
// single episodes, against what the library and open requests already cover.
// A sticky bar at the bottom says what will be requested and sends it.
export function createSeriesPicker({ tmdbId, seasons = [], coverage = null, seriesExists = false, banned = false } = {}) {
  const cover = coverage || buildRequestCoverage([]);
  const regular = seasons.filter(season => !season.special);
  const wholeBlocked = banned || cover.all || seriesExists;

  const state = {
    mode: wholeBlocked ? 'season' : 'all',
    seasons: new Set(),
    episodes: new Map(), // "s:e" -> { seasonNumber, episodeNumber, name }
    openSeason: null,
    episodeLists: new Map(),
    busy: false
  };

  const modeButtons = MODES.map(mode => createElement('button', {
    className: 'ui-segment',
    type: 'button',
    disabled: banned || (mode.id === 'all' && wholeBlocked) || (mode.id !== 'all' && regular.length === 0),
    onClick: () => {
      state.mode = mode.id;
      render();
    }
  }, mode.label));

  const modes = createElement('div', { className: 'ui-segmented ui-segmented-full', role: 'group', 'aria-label': 'Was anfragen?' }, ...modeButtons);
  const panel = createElement('div', { className: 'series-picker-panel' });
  const summary = createElement('span', { className: 'ui-action-bar-text' });
  const submitButton = createElement('button', { className: 'ui-button ui-button-primary', type: 'button', onClick: () => submit() }, 'Anfragen');
  const bar = createElement('div', { className: 'ui-action-bar series-picker-bar' }, summary, submitButton);

  const element = createElement('section', { className: 'ui-section series-picker' },
    createElement('h2', { className: 'ui-group-title' }, 'Was möchtest du anfragen?'),
    modes,
    panel,
    bar
  );

  const episodeKey = (s, e) => `${s}:${e}`;

  function targets() {
    if (state.mode === 'all') return [{ scope: 'all', label: 'Komplette Serie' }];
    if (state.mode === 'season') {
      return [...state.seasons].sort((a, b) => a - b).map(n => ({ scope: 'season', seasonNumber: n, label: `Staffel ${n}` }));
    }
    return [...state.episodes.values()]
      .sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber)
      .map(e => ({ scope: 'episode', seasonNumber: e.seasonNumber, episodeNumber: e.episodeNumber, label: `S${String(e.seasonNumber).padStart(2, '0')}E${String(e.episodeNumber).padStart(2, '0')}` }));
  }

  function renderBar() {
    const list = targets();
    let text;
    let ready = list.length > 0 && !state.busy && !banned;
    if (banned) text = 'Diese Serie wurde abgelehnt und kann nicht angefragt werden.';
    else if (state.mode === 'all' && wholeBlocked) {
      text = cover.all ? 'Die Serie ist bereits angefragt.' : 'Die Serie ist schon in der Bibliothek — frag fehlende Staffeln oder Folgen an.';
      ready = false;
    } else if (state.mode === 'all') text = 'Alle Staffeln dieser Serie';
    else if (!list.length) text = state.mode === 'season' ? 'Wähle eine oder mehrere Staffeln' : 'Wähle eine oder mehrere Folgen';
    else if (state.mode === 'season') text = `${list.length === 1 ? '1 Staffel' : `${list.length} Staffeln`}: ${list.map(t => t.seasonNumber).join(', ')}`;
    else text = `${list.length === 1 ? '1 Folge' : `${list.length} Folgen`} ausgewählt`;

    summary.textContent = text;
    submitButton.disabled = !ready;
    submitButton.textContent = state.busy ? 'Wird angefragt …'
      : state.mode === 'all' ? 'Serie anfragen'
        : list.length > 1 ? `${list.length} anfragen` : 'Anfragen';
  }

  function seasonRow(season, { onClick, selected = false, trailing = null, expanded = null }) {
    const status = seasonState(season, cover);
    const poster = getTmdbImageUrl(season.poster_path, 'w154');
    const meta = [season.episode_count ? `${season.episode_count} Folgen` : null].filter(Boolean).join(' · ');
    const row = createElement('button', {
      className: `ui-row series-picker-season${selected ? ' is-selected' : ''}`,
      type: 'button',
      disabled: state.mode === 'season' && !status.selectable,
      'aria-pressed': state.mode === 'season' ? String(selected) : null,
      'aria-expanded': expanded === null ? null : String(expanded),
      onClick
    },
      poster
        ? createElement('img', { className: 'ui-thumb', src: poster, alt: '', loading: 'lazy' })
        : createElement('span', { className: 'ui-thumb series-picker-thumb-empty' }, String(season.season_number)),
      createElement('span', { className: 'ui-row-text' },
        createElement('span', { className: 'ui-row-title' }, season.name || `Staffel ${season.season_number}`),
        createElement('span', { className: 'series-picker-row-meta' },
          meta ? createElement('span', { className: 'ui-row-meta' }, meta) : null,
          createElement('span', { className: `ui-chip ${status.chip}` }, status.label)
        )
      ),
      trailing
    );
    return row;
  }

  function renderSeasons() {
    const list = createElement('div', { className: 'ui-list' });
    regular.forEach(season => {
      const selected = state.seasons.has(season.season_number);
      list.appendChild(seasonRow(season, {
        selected,
        trailing: html('ui-check', CHECK),
        onClick: () => {
          if (selected) state.seasons.delete(season.season_number);
          else state.seasons.add(season.season_number);
          render();
        }
      }));
    });
    panel.appendChild(list);
  }

  function episodeRow(season, episode) {
    const number = episode.episode_number;
    const key = episodeKey(season.season_number, number);
    const inLibrary = season.complete || season.availableEpisodes.includes(number);
    const requested = isScopeCovered(cover, { scope: 'episode', seasonNumber: season.season_number, episodeNumber: number });
    const selected = state.episodes.has(key);
    const upcoming = isUpcoming(episode);
    const status = inLibrary ? { label: 'In Bibliothek', chip: 'ui-chip-success' }
      : requested ? { label: 'Angefragt', chip: 'ui-chip-warning' }
        : upcoming ? { label: `Ab ${formatDate(episode.air_date)}`, chip: 'ui-chip-muted' }
          : null;

    return createElement('button', {
      className: `ui-row series-picker-episode${selected ? ' is-selected' : ''}`,
      type: 'button',
      disabled: inLibrary || requested,
      'aria-pressed': String(selected),
      onClick: () => {
        if (selected) state.episodes.delete(key);
        else state.episodes.set(key, { seasonNumber: season.season_number, episodeNumber: number, name: episode.name });
        render();
      }
    },
      createElement('span', { className: 'series-picker-episode-number' }, String(number)),
      createElement('span', { className: 'ui-row-text' },
        createElement('span', { className: 'ui-row-title' }, episode.name || `Folge ${number}`),
        createElement('span', { className: 'series-picker-row-meta' },
          formatDate(episode.air_date) && !upcoming ? createElement('span', { className: 'ui-row-meta' }, formatDate(episode.air_date)) : null,
          status ? createElement('span', { className: `ui-chip ${status.chip}` }, status.label) : null
        )
      ),
      html('ui-check', CHECK)
    );
  }

  async function loadEpisodes(season) {
    state.episodeLists.set(season.season_number, { status: 'loading', items: [] });
    render();
    try {
      const data = await RequestsApi.getSeason(tmdbId, season.season_number);
      state.episodeLists.set(season.season_number, { status: 'ready', items: Array.isArray(data?.episodes) ? data.episodes : [] });
    } catch (error) {
      state.episodeLists.set(season.season_number, { status: 'error', items: [], message: error?.message || 'Folgen konnten nicht geladen werden.' });
    }
    render();
  }

  function renderEpisodes() {
    const list = createElement('div', { className: 'ui-list' });
    regular.forEach(season => {
      const open = state.openSeason === season.season_number;
      const picked = [...state.episodes.values()].filter(e => e.seasonNumber === season.season_number).length;
      const trailing = createElement('span', { className: 'series-picker-accordion-end' },
        picked ? createElement('span', { className: 'ui-chip ui-chip-accent' }, `${picked} gewählt`) : null,
        html(`series-picker-chevron${open ? ' is-open' : ''}`, CHEVRON)
      );
      const wrap = createElement('div', { className: `series-picker-accordion${open ? ' is-open' : ''}` },
        seasonRow(season, {
          expanded: open,
          trailing,
          onClick: () => {
            state.openSeason = open ? null : season.season_number;
            if (!open && !state.episodeLists.has(season.season_number)) loadEpisodes(season);
            else render();
          }
        })
      );

      if (open) {
        const entry = state.episodeLists.get(season.season_number);
        const body = createElement('div', { className: 'series-picker-episodes' });
        if (!entry || entry.status === 'loading') body.appendChild(createElement('p', { className: 'ui-hint' }, 'Folgen werden geladen …'));
        else if (entry.status === 'error') {
          body.appendChild(createElement('p', { className: 'ui-hint' }, entry.message));
          body.appendChild(createElement('button', { className: 'ui-button ui-button-ghost', type: 'button', onClick: () => loadEpisodes(season) }, 'Erneut versuchen'));
        } else if (!entry.items.length) body.appendChild(createElement('p', { className: 'ui-hint' }, 'Für diese Staffel sind noch keine Folgen bekannt.'));
        else entry.items.forEach(episode => body.appendChild(episodeRow(season, episode)));
        wrap.appendChild(body);
      }
      list.appendChild(wrap);
    });
    panel.appendChild(list);
  }

  function renderAll() {
    const inLibrary = regular.filter(season => season.complete).length;
    const text = cover.all
      ? 'Die ganze Serie ist bereits angefragt.'
      : seriesExists
        ? `Die Serie ist schon in der Bibliothek (${inLibrary} von ${regular.length} Staffeln komplett). Fehlende Staffeln oder Folgen fragst du unter „Staffeln“ oder „Folgen“ an.`
        : `Alle ${regular.length || ''} Staffeln werden angefragt — auch künftige.`.replace('  ', ' ');
    panel.appendChild(createElement('div', { className: 'ui-card series-picker-note' }, createElement('p', {}, text)));
  }

  function render() {
    modeButtons.forEach((button, index) => {
      const active = MODES[index].id === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    panel.innerHTML = '';
    if (state.mode === 'all') renderAll();
    else if (state.mode === 'season') renderSeasons();
    else renderEpisodes();
    renderBar();
  }

  // One request per target, one after another; what went through counts as
  // covered at once, what failed stays selected.
  async function submit() {
    const list = targets();
    if (!list.length || state.busy) return;
    state.busy = true;
    renderBar();

    const done = [];
    const failed = [];
    for (const target of list) {
      try {
        await RequestsApi.createRequest(tmdbId, 'tv', '', target);
        addScopeToCoverage(cover, target);
        done.push(target);
        if (target.scope === 'season') state.seasons.delete(target.seasonNumber);
        if (target.scope === 'episode') state.episodes.delete(episodeKey(target.seasonNumber, target.episodeNumber));
      } catch (error) {
        failed.push({ target, error });
      }
    }

    state.busy = false;
    if (done.length && !failed.length) {
      appStore.showToast(done.length === 1 ? `${done[0].label} angefragt` : `${done.length} Anfragen gestellt`, 'success');
    } else if (done.length) {
      appStore.showToast(`${done.length} angefragt, ${failed.length} fehlgeschlagen: ${failed[0].error.message}`, 'error');
    } else if (failed.length) {
      appStore.showToast(failed[0].error.message || 'Anfrage fehlgeschlagen', 'error');
    }
    render();
  }

  render();
  return { element };
}
