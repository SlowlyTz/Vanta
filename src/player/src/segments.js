// Skippable segments (intro, recap) get a button while they run; the outro
// drives the next-episode prompt (see nextEpisode.js).

import { seekTo } from './seek.js';

const SKIP_LABELS = { intro: 'Intro überspringen', recap: 'Rückblick überspringen' };
// No button for the last moments of a segment: it would vanish mid-click.
const END_MARGIN_SECONDS = 1.5;

export function activeSkipSegment(segments, currentTime) {
  if (!Number.isFinite(currentTime)) return null;
  return (segments || []).find(segment => SKIP_LABELS[segment.type]
    && currentTime >= segment.startMs / 1000
    && currentTime < segment.endMs / 1000 - END_MARGIN_SECONDS) || null;
}

export function findOutro(segments) {
  return (segments || []).find(segment => segment.type === 'outro') || null;
}

export function bindSegments(context, { loadSegments }) {
  const { player, root, listen } = context;
  context.segments = [];
  const button = root.querySelector('.vanta-player-skip-segment');
  let shown = null;

  const mayControl = () => !context.watchParty?.enabled || context.canControlWatchParty();

  // Skipped once per segment, so seeking back into it plays it.
  const autoSkipped = new Set();
  const autoSkip = () => Boolean(context.userPreferences?.autoSkipIntro) && !context.watchParty?.enabled;

  const update = () => {
    const segment = mayControl() ? activeSkipSegment(context.segments, Number(player.currentTime)) : null;
    // "Intro automatisch überspringen" skips intros only; a recap keeps its
    // button, since it is often worth watching.
    if (segment?.type === 'intro' && autoSkip() && !autoSkipped.has(segment)) {
      autoSkipped.add(segment);
      seekTo(player, segment.endMs / 1000, { endEpsilon: 0.25 });
      return;
    }
    if (segment === shown) return;
    shown = segment;
    if (!button) return;
    if (segment) {
      button.querySelector('.vanta-player-skip-segment-label').textContent = SKIP_LABELS[segment.type];
      button.hidden = false;
      void button.offsetWidth;
      button.classList.add('is-visible');
    } else {
      button.classList.remove('is-visible');
      button.hidden = true;
    }
  };

  if (button) {
    listen(button, 'click', event => {
      event.stopPropagation();
      if (!shown || !mayControl()) return;
      seekTo(player, shown.endMs / 1000, { endEpsilon: 0.25 });
      update();
    });
  }
  listen(player, 'time-update', update);
  context.refreshSegmentButton = update;

  if (typeof loadSegments === 'function') {
    Promise.resolve()
      .then(() => loadSegments())
      .then(result => {
        if (context.destroyed) return;
        context.segments = Array.isArray(result?.segments) ? result.segments : [];
        update();
      })
      .catch(() => {
        // Without segments the player simply has no skip button.
      });
  }
  return context;
}
