import { createElement } from '../../utils/dom.js';
import { MediaApi } from '../../api/media.api.js';
import { MediaCard } from '../../components/mediaCard.js';

export function buildSeasonsSection(item, seasons) {
  const episodeGrid = createElement('div', { className: 'episodes-grid' });
  const tabs = [];

  const loadSeasonEpisodes = async (seasonId, tabButton) => {
    const activeTab = seasonsTabsContainer.querySelector('.season-tab.active');
    if (activeTab) activeTab.classList.remove('active');
    tabButton.classList.add('active');

    episodeGrid.innerHTML = '';

    const gridLoader = createElement('div', { className: 'search-empty-state', style: { gridColumn: '1/-1', minHeight: '150px' } },
      createElement('div', { className: 'loader-spinner', style: { width: '30px', height: '30px' } })
    );
    episodeGrid.appendChild(gridLoader);

    try {
      const episodes = await MediaApi.getEpisodes(item.Id, seasonId);
      episodeGrid.innerHTML = '';

      if (episodes.length === 0) {
        episodeGrid.appendChild(
          createElement('div', { className: 'search-empty-state', style: { gridColumn: '1/-1' } },
            createElement('p', {}, 'Keine Episoden in dieser Staffel gefunden.')
          )
        );
      } else {
        episodes.forEach(episode => {
          const card = MediaCard({ item: episode, landscape: true });
          if (card) episodeGrid.appendChild(card);
        });
      }
    } catch (err) {
      console.error(err);
      episodeGrid.innerHTML = '';
      episodeGrid.appendChild(
        createElement('div', { className: 'search-empty-state', style: { gridColumn: '1/-1' } },
          createElement('p', {}, 'Fehler beim Laden der Episoden.')
        )
      );
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
