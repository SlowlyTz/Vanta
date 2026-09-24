export function formatEpisodeCode(episode) {
  const season = String(episode.ParentIndexNumber || 1).padStart(2, '0');
  const index = String(episode.IndexNumber || 1).padStart(2, '0');
  return `S${season}E${index}`;
}

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
