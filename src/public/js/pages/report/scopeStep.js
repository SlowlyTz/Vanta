import { createElement } from '../../utils/dom.js';
import { MediaApi } from '../../api/media.api.js';
import { formatEpisodeCode } from '../../shared/episodeCode.js';
import { iconElement } from './icons.js';

const MODES = [
  { key: 'all', label: 'Ganze Serie' },
  { key: 'season', label: 'Staffel' },
  { key: 'episode', label: 'Folge' }
];

// Step 2 for a series: the whole series, one season, or one episode, picked
// from what is actually in the library.
export function createScopeStep({ onChange }) {
  let series = null;
  let seasons = [];
  let mode = 'all';
  let season = null;
  let episode = null;
  const episodeCache = new Map();

  const modeButtons = MODES.map(entry => createElement('button', {
    className: 'ui-segment',
    type: 'button',
    onClick: () => setMode(entry.key)
  }, entry.label));
  const modes = createElement('div', { className: 'ui-segmented ui-segmented-full', role: 'group', 'aria-label': 'Betrifft' }, ...modeButtons);

  const seasonChips = createElement('div', { className: 'report-chips', role: 'group', 'aria-label': 'Staffel' });
  const episodeList = createElement('div', { className: 'ui-list report-episodes' });
  const status = createElement('p', { className: 'ui-hint' });
  const element = createElement('div', { className: 'report-scope-step' }, modes, seasonChips, episodeList, status);

  const emit = () => onChange({
    scope: mode,
    seasonNumber: mode === 'all' ? null : season?.IndexNumber ?? null,
    episodeNumber: mode === 'episode' ? episode?.IndexNumber ?? null : null,
    label: describe()
  });

  const describe = () => {
    if (mode === 'all') return 'Ganze Serie';
    if (!season) return null;
    const seasonLabel = season.Name || `Staffel ${season.IndexNumber}`;
    if (mode === 'season') return seasonLabel;
    return episode ? `${formatEpisodeCode(episode)} · ${episode.Name}` : null;
  };

  function render() {
    modeButtons.forEach((button, index) => {
      const active = MODES[index].key === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    seasonChips.hidden = mode === 'all';
    seasonChips.innerHTML = '';
    seasons.forEach(entry => {
      const selected = season?.Id === entry.Id;
      seasonChips.appendChild(createElement('button', {
        className: `report-chip${selected ? ' is-selected' : ''}`,
        type: 'button',
        'aria-pressed': String(selected),
        onClick: () => selectSeason(entry)
      }, entry.Name || `Staffel ${entry.IndexNumber}`));
    });

    episodeList.hidden = mode !== 'episode' || !season;
  }

  function setMode(next) {
    mode = next;
    if (mode !== 'episode') episode = null;
    if (mode !== 'all' && !season && seasons.length === 1) season = seasons[0];
    render();
    if (mode === 'episode' && season) loadEpisodes();
    emit();
  }

  function selectSeason(entry) {
    season = entry;
    episode = null;
    render();
    if (mode === 'episode') loadEpisodes();
    emit();
  }

  async function loadEpisodes() {
    const current = season;
    episodeList.innerHTML = '';
    status.textContent = 'Folgen werden geladen …';
    try {
      if (!episodeCache.has(current.Id)) episodeCache.set(current.Id, await MediaApi.getEpisodes(series.Id, current.Id));
      if (season !== current) return;
      const episodes = episodeCache.get(current.Id) || [];
      status.textContent = episodes.length ? '' : 'In dieser Staffel sind keine Folgen in der Bibliothek.';
      episodes.forEach(entry => {
        const selected = episode?.Id === entry.Id;
        episodeList.appendChild(createElement('button', {
          className: `ui-row${selected ? ' is-selected' : ''}`,
          type: 'button',
          'aria-pressed': String(selected),
          onClick: () => {
            episode = entry;
            loadEpisodes();
            emit();
          }
        },
          createElement('span', { className: 'report-episode-number' }, String(entry.IndexNumber ?? '–')),
          createElement('span', { className: 'ui-row-text' },
            createElement('span', { className: 'ui-row-title' }, entry.Name || `Folge ${entry.IndexNumber}`),
            createElement('span', { className: 'ui-row-meta' }, formatEpisodeCode(entry))
          ),
          iconElement(createElement, 'check', 'ui-check')
        ));
      });
    } catch {
      if (season === current) status.textContent = 'Folgen konnten nicht geladen werden.';
    }
  }

  const setSeries = async item => {
    series = item;
    seasons = [];
    season = null;
    episode = null;
    mode = 'all';
    episodeCache.clear();
    render();
    emit();
    if (!item) return;
    status.textContent = 'Staffeln werden geladen …';
    try {
      const loaded = await MediaApi.getSeasons(item.Id);
      if (series !== item) return;
      seasons = (loaded || []).filter(entry => Number.isInteger(entry.IndexNumber));
      status.textContent = '';
    } catch {
      if (series === item) status.textContent = 'Staffeln konnten nicht geladen werden; du kannst die ganze Serie melden.';
    }
    modeButtons.slice(1).forEach(button => { button.disabled = seasons.length === 0; });
    render();
  };

  return { element, setSeries };
}
