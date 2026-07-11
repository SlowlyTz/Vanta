import { MediaApi } from '../api/media.api.js';

export async function loadEpisodeContext(item) {
  if (item.Type !== 'Episode' || !item.SeriesId) return null;

  const seasons = await MediaApi.getSeasons(item.SeriesId);
  const episodesBySeason = {};

  for (const season of seasons || []) {
    episodesBySeason[season.Id] = await MediaApi.getEpisodes(item.SeriesId, season.Id);
  }

  return {
    seriesId: item.SeriesId,
    seriesName: item.SeriesName,
    currentEpisodeId: item.Id,
    seasons: seasons || [],
    episodesBySeason
  };
}
