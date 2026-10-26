// When the next-episode prompt shows and where the next episode is; shared by
// the player and the server.

// Progress at which the "next episode" overlay appears (without an outro).
export const NEXT_EPISODE_PROMPT_THRESHOLD = 0.97;
// The next episode starts this long after the overlay appeared, however long
// the credits still run. The button fills up over these seconds.
export const NEXT_EPISODE_COUNTDOWN_SECONDS = 10;
// The switch happens at least this long before the end of the file.
const END_MARGIN_SECONDS = 0.5;

// With an outro the prompt appears when the credits begin and counts down from there.
// Without one it appears at 97 % (earlier on short files, so the countdown fits) and
// counts down to the end of the file, so the end of an episode is never cut off.
export function computeNextEpisodeTimings({
  duration,
  outro = null,
  promptThreshold = NEXT_EPISODE_PROMPT_THRESHOLD,
  countdownSeconds = NEXT_EPISODE_COUNTDOWN_SECONDS
} = {}) {
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const lastSkip = Math.max(0, duration - END_MARGIN_SECONDS);
  const skipAfter = promptAt => ({ promptAt, skipAt: Math.max(promptAt, Math.min(lastSkip, promptAt + countdownSeconds)) });

  // Only an outro in the second half is trusted as the credits.
  const outroStart = Number(outro?.startMs) / 1000;
  const outroEnd = Number(outro?.endMs) / 1000;
  if (Number.isFinite(outroStart) && Number.isFinite(outroEnd) && outroStart >= duration * 0.5 && outroStart < duration) {
    return { ...skipAfter(outroStart), source: 'outro' };
  }

  const promptAt = Math.max(0, Math.min(duration * promptThreshold, lastSkip - countdownSeconds));
  return { promptAt, skipAt: lastSkip, source: 'runtime' };
}

// When the prompt shows clearly later than planned (the viewer jumped into
// the credits), the countdown still runs its full length from now. A prompt
// on time keeps the planned point, so every watch-party member counts to the
// same second.
const LATE_PROMPT_SECONDS = 1;

export function nextEpisodeSkipAt(timings, currentTime, duration, countdownSeconds = NEXT_EPISODE_COUNTDOWN_SECONDS) {
  if (!timings) return null;
  if (!Number.isFinite(currentTime) || currentTime <= timings.promptAt + LATE_PROMPT_SECONDS) return timings.skipAt;
  const lastSkip = Math.max(0, duration - END_MARGIN_SECONDS);
  return Math.min(lastSkip, Math.max(timings.skipAt, currentTime + countdownSeconds));
}

export function shouldShowNextEpisodePrompt({ currentTime, duration, ...thresholds }) {
  if (!Number.isFinite(currentTime)) return false;

  const timings = computeNextEpisodeTimings({ duration, ...thresholds });
  if (!timings) return false;

  return currentTime >= timings.promptAt;
}

export function canStartNextEpisode(watchParty) {
  return !watchParty?.enabled || Boolean(watchParty.canControl);
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
    // The prompt went away without a choice (the viewer seeked back before
    // it): it may show again when playback gets there once more.
    markHidden(episodeId) {
      if (shownFor === episodeId) shownFor = null;
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
