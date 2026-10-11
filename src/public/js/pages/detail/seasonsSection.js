import { createElement } from '../../utils/dom.js';
import { MediaApi } from '../../api/media.api.js';
import { MediaCard } from '../../components/mediaCard.js';
import { EmptyState, ErrorState } from '../../components/emptyState.js';
import { createSectionLoader, setSectionBusy } from '../../components/loader.js';

export function buildSeasonsSection(item, seasons) {
  const episodeGrid = createElement('div', { className: 'episodes-grid' });
  const tabs = [];

  const loadSeasonEpisodes = async (seasonId, tabButton) => {
    const activeTab = seasonsTabsContainer.querySelector('.season-tab.active');
    if (activeTab) activeTab.classList.remove('active');
    tabButton.classList.add('active');

    episodeGrid.innerHTML = '';
    setSectionBusy(episodeGrid, true);
    episodeGrid.appendChild(createSectionLoader({ label: 'Episoden werden geladen', compact: true }));

    try {
      const episodes = await MediaApi.getEpisodes(item.Id, seasonId);
      episodeGrid.innerHTML = '';

      if (episodes.length === 0) {
        episodeGrid.appendChild(
          EmptyState({ message: 'Keine Episoden in dieser Staffel gefunden.', style: { gridColumn: '1/-1' } })
        );
      } else {
        episodes.forEach(episode => {
          const card = MediaCard({ item: episode, landscape: true, playedToggle: true });
          if (card) episodeGrid.appendChild(card);
        });
      }
    } catch (err) {
      console.error(err);
      episodeGrid.innerHTML = '';
      episodeGrid.appendChild(
        ErrorState({ title: null, message: 'Fehler beim Laden der Episoden.', style: { gridColumn: '1/-1' } })
      );
    } finally {
      setSectionBusy(episodeGrid, false);
    }
  };

  const seasonTabs = seasons.map((season, index) => {
    const tab = createElement('button', {
      className: `season-tab ${index === 0 ? 'active' : ''}`,
      onClick: (e) => {
        loadSeasonEpisodes(season.Id, e.target);
      }
    }, season.Name || `Staffel ${season.IndexNumber || index + 1}`);

    tabs.push(tab);
    return tab;
  });

  const seasonsTabsContainer = createElement('div', { className: 'seasons-tabs' }, seasonTabs);

  const seasonsSection = createElement('div', { className: 'seasons-section' },
    createElement('h3', { className: 'cast-title' }, 'Staffeln & Folgen'),
    seasonsTabsContainer,
    episodeGrid
  );

  setTimeout(() => {
    if (tabs[0] && seasons[0]) {
      loadSeasonEpisodes(seasons[0].Id, tabs[0]);
    }
  }, 50);

  return seasonsSection;
}
