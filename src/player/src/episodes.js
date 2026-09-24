export { formatEpisodeCode } from '../../public/js/shared/episodeCode.js';

export function findEpisode(context, episodeId) {
  for (const episodes of Object.values(context?.episodesBySeason || {})) {
    const match = episodes.find(episode => episode.Id === episodeId);
    if (match) return match;
  }
  return null;
}

// The season an episode belongs to, so the episode page opens on it.
export function findSeasonIdOfEpisode(context, episodeId) {
  for (const [seasonId, episodes] of Object.entries(context?.episodesBySeason || {})) {
    if (episodes.some(episode => episode.Id === episodeId)) return seasonId;
  }
  return context?.seasons?.[0]?.Id || null;
}
