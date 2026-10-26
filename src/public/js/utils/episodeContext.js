// Seasons and episodes of an episode's series, for the player's episode
// browser and next-episode logic. All seasons load in parallel.
import { MediaApi } from '../api/media.api.js';

export async function loadEpisodeContext(item, { signal } = {}) {
  if (item.Type !== 'Episode' || !item.SeriesId) return null;

  const seasons = (await MediaApi.getSeasons(item.SeriesId, { signal })) || [];
  const episodeLists = await Promise.all(seasons.map(season => MediaApi.getEpisodes(item.SeriesId, season.Id, { signal })));
  const episodesBySeason = Object.fromEntries(seasons.map((season, index) => [season.Id, episodeLists[index]]));

  return {
    seriesId: item.SeriesId,
    seriesName: item.SeriesName,
    currentEpisodeId: item.Id,
    seasons,
    episodesBySeason
  };
}
