export function shouldShowNextEpisodePrompt({ currentTime, duration, threshold = 0.9 }) {
  if (!Number.isFinite(duration) || duration <= 0) return false;
  if (!Number.isFinite(currentTime)) return false;
  return currentTime / duration >= threshold;
}

export function canStartNextEpisode(watchParty) {
  return !watchParty?.enabled || Boolean(watchParty.canControl ?? watchParty.isOwner);
}

export function createNextEpisodeGate() {
  const dismissed = new Set();
  let shownFor = null;

  return {
    shouldTrigger(episodeId) {
      return Boolean(episodeId) && !dismissed.has(episodeId) && shownFor !== episodeId;
    },
    markShown(episodeId) {
      shownFor = episodeId;
    },
    markDismissed(episodeId) {
      if (episodeId) dismissed.add(episodeId);
    }
  };
}

export function findNextEpisode(context, currentEpisodeId = context?.currentEpisodeId) {
  const seasons = [...(context?.seasons || [])].sort((a, b) => {
    return (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0);
  });

  for (let seasonIndex = 0; seasonIndex < seasons.length; seasonIndex += 1) {
    const season = seasons[seasonIndex];
    const episodes = [...(context?.episodesBySeason?.[season.Id] || [])].sort((a, b) => {
      return (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0);
    });

    const currentIndex = episodes.findIndex(episode => episode.Id === currentEpisodeId);
    if (currentIndex === -1) continue;

    const nextInSeason = episodes[currentIndex + 1];
    if (nextInSeason) {
      return {
        kind: 'next-episode',
        episode: nextInSeason,
        season,
        fromSeason: season
      };
    }

    for (let nextSeasonIndex = seasonIndex + 1; nextSeasonIndex < seasons.length; nextSeasonIndex += 1) {
      const nextSeason = seasons[nextSeasonIndex];
      const nextEpisodes = [...(context?.episodesBySeason?.[nextSeason.Id] || [])].sort((a, b) => {
        return (a.IndexNumber ?? 0) - (b.IndexNumber ?? 0);
      });
      if (nextEpisodes[0]) {
        return {
          kind: 'next-season',
          episode: nextEpisodes[0],
          season: nextSeason,
          fromSeason: season
        };
      }
    }

    return null;
  }

  return null;
}
