// Progress at which the "next episode" overlay appears.
export const NEXT_EPISODE_PROMPT_THRESHOLD = 0.97;
// Progress at which playback auto-advances to the next episode.
export const NEXT_EPISODE_SKIP_THRESHOLD = 0.985;
// The overlay is always visible for at least this long before the auto-advance.
// On short episodes the gap between the two thresholds is smaller than this, so
// the overlay is pulled forward rather than the skip being pushed back.
export const NEXT_EPISODE_MIN_PROMPT_SECONDS = 25;

// With an outro segment the prompt appears when the credits begin and the
// next episode starts when they end, at least this long after the prompt.
export const OUTRO_MIN_PROMPT_SECONDS = 10;

export function computeNextEpisodeTimings({
  duration,
  outro = null,
  promptThreshold = NEXT_EPISODE_PROMPT_THRESHOLD,
  skipThreshold = NEXT_EPISODE_SKIP_THRESHOLD,
  minPromptSeconds = NEXT_EPISODE_MIN_PROMPT_SECONDS
} = {}) {
  if (!Number.isFinite(duration) || duration <= 0) return null;

  // Only an outro in the second half is trusted as the credits.
  const outroStart = Number(outro?.startMs) / 1000;
  const outroEnd = Number(outro?.endMs) / 1000;
  if (Number.isFinite(outroStart) && Number.isFinite(outroEnd) && outroStart >= duration * 0.5 && outroStart < duration) {
    const promptAt = outroStart;
    const skipAt = Math.min(duration - 0.5, Math.max(outroEnd, promptAt + OUTRO_MIN_PROMPT_SECONDS));
    return { promptAt, skipAt: Math.max(promptAt, skipAt), source: 'outro' };
  }

  const skipAt = duration * skipThreshold;
  const promptAt = Math.max(0, Math.min(duration * promptThreshold, skipAt - minPromptSeconds));

  return { promptAt, skipAt, source: 'runtime' };
}

export function shouldShowNextEpisodePrompt({ currentTime, duration, ...thresholds }) {
  if (!Number.isFinite(currentTime)) return false;

  const timings = computeNextEpisodeTimings({ duration, ...thresholds });
  if (!timings) return false;

  return currentTime >= timings.promptAt;
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
