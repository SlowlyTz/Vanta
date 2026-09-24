// How an episode is named: "S01E02" in lists and cards, "S1 · F2" in the
// player's and the lobby's headings.

export function episodeCode(season, episode) {
  const pad = value => String(value || 1).padStart(2, '0');
  return `S${pad(season)}E${pad(episode)}`;
}

// For a Jellyfin episode item.
export function formatEpisodeCode(item) {
  return episodeCode(item?.ParentIndexNumber, item?.IndexNumber);
}

// null when either number is unknown.
export function episodeHeadingCode(season, episode) {
  if (!Number.isFinite(season) || !Number.isFinite(episode)) return null;
  return `S${season} · F${episode}`;
}
