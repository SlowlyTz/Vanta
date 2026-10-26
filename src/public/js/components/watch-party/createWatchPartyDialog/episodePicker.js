// Watch party dialog: season tabs and episode list for a picked series, and the Back button.
import { createElement } from '../../../utils/dom.js';
import { MediaApi } from '../../../api/media.api.js';
import { formatEpisodeCode } from './context.js';

export function bindEpisodePicker(ctx) {
  ctx.renderSeasonTabs = seasons => {
    ctx.seasonTabs.innerHTML = '';
    ctx.seasonTabs.hidden = seasons.length <= 1;

    seasons.forEach((season, index) => {
      const tab = createElement('button', {
        className: `watch-party-season-tab${index === 0 ? ' active' : ''}`,
        type: 'button',
        onClick: event => {
          ctx.seasonTabs.querySelectorAll('.watch-party-season-tab').forEach(el => el.classList.remove('active'));
          event.currentTarget.classList.add('active');
          ctx.loadSeasonEpisodes(ctx.selectedSeries.Id, season.Id);
        }
      }, season.Name || `Staffel ${season.IndexNumber ?? index + 1}`);
      ctx.seasonTabs.appendChild(tab);
    });
  };

  ctx.renderEpisodeCards = episodes => {
    ctx.resultsList.innerHTML = '';
    ctx.resultsList.className = 'watch-party-episode-list';

    if (!episodes.length) {
      ctx.resultsList.appendChild(createElement('li', { className: 'watch-party-empty-state' }, 'Keine Folgen in dieser Staffel.'));
      return;
    }

    episodes.forEach(episode => {
      ctx.resultsList.appendChild(createElement('li', { className: 'watch-party-episode-item' },
        createElement('button', {
          className: 'watch-party-episode-button',
          type: 'button',
          disabled: ctx.creating,
          onClick: () => ctx.showConfirm({ ...episode, SeriesName: episode.SeriesName || ctx.selectedSeries?.Name, SeriesId: episode.SeriesId || ctx.selectedSeries?.Id })
        },
          createElement('span', { className: 'watch-party-episode-index' }, formatEpisodeCode(episode)),
          createElement('span', { className: 'watch-party-episode-title' }, episode.Name || 'Unbenannte Folge')
        )
      ));
    });
  };

  // Every load and view switch bumps ctx.searchRunId; an answer for an
  // older one is dropped.
  const isStale = runId => runId !== ctx.searchRunId || ctx.currentView !== 'pick-episode';

  ctx.loadSeasonEpisodes = async (seriesId, seasonId) => {
    const runId = ++ctx.searchRunId;
    ctx.setStatus('Folgen werden geladen …');
    ctx.resultsList.innerHTML = '';

    try {
      const episodes = await MediaApi.getEpisodes(seriesId, seasonId);
      if (isStale(runId)) return;
      ctx.setStatus('');
      ctx.renderEpisodeCards(episodes || []);
    } catch (error) {
      if (isStale(runId)) return;
      console.error('[Watch Party Episodes Error]', error);
      ctx.setStatus('Folgen konnten nicht geladen werden.');
    }
  };

  ctx.showEpisodePicker = async series => {
    const runId = ++ctx.searchRunId;
    ctx.currentView = 'pick-episode';
    ctx.selectedSeries = series;
    ctx.titleEl.textContent = series.Name || 'Episode wählen';
    ctx.backButton.hidden = false;
    ctx.searchInput.hidden = true;
    ctx.setStatus('Staffeln werden geladen …');
    ctx.resultsList.innerHTML = '';
    ctx.seasonTabs.innerHTML = '';
    ctx.seasonTabs.hidden = true;

    try {
      const seasons = await MediaApi.getSeasons(series.Id);
      if (isStale(runId)) return;
      if (!seasons?.length) {
        ctx.setStatus('Keine Staffeln für diese Serie gefunden.');
        return;
      }

      ctx.renderSeasonTabs(seasons);
      await ctx.loadSeasonEpisodes(series.Id, seasons[0].Id);
    } catch (error) {
      if (isStale(runId)) return;
      console.error('[Watch Party Episode Picker Error]', error);
      ctx.setStatus('Episoden konnten nicht geladen werden.');
    }
  };

  ctx.handleBack = () => {
    if (ctx.currentView === 'confirm') ctx.restoreBeforeConfirm();
    else if (ctx.currentView === 'pick-episode') ctx.showPickMediaView();
    else if (ctx.currentView === 'pick-media' && ctx.liveParties?.length) ctx.showContinueChoice();
  };

  return ctx;
}
