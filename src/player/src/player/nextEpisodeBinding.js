import {
  findNextEpisode,
  shouldShowNextEpisodePrompt,
  computeNextEpisodeTimings,
  canStartNextEpisode,
  createNextEpisodeGate
} from '../nextEpisode.js';
import { createNextEpisodePrompt } from '../nextEpisodePrompt.js';
import { NEXT_EPISODE_VIEWER_MESSAGE } from './markup.js';
import { findOutro } from '../segments.js';

// The "next episode" prompt near the end of an episode: when it shows (see
// nextEpisode.js for the timing), who may act on it in a watch party, and
// how the party can close it for everyone.
export function bindNextEpisode(context) {
  const { root, player, watchParty, episodeBrowser } = context;

  const nextEpisodeGate = createNextEpisodeGate();

  context.nextEpisodePrompt = episodeBrowser?.enabled
    ? createNextEpisodePrompt({
        root: root.querySelector('.vanta-player-shell'),
        onConfirm: (next, { auto = false } = {}) => {
          episodeBrowser.onNextEpisode?.(next, { auto });
        },
        onDismiss: next => {
          nextEpisodeGate.markDismissed(episodeBrowser.context?.currentEpisodeId);
          // In a watch party an admin's cancel closes the prompt for everyone.
          if (canStartNextEpisode(watchParty)) episodeBrowser.onDismissNextEpisode?.(next);
        }
      })
    : null;

  // The party cancelled the prompt (an admin pressed "Abbrechen").
  context.cancelNextEpisode = () => {
    nextEpisodeGate.markDismissed(episodeBrowser?.context?.currentEpisodeId);
    context.nextEpisodePrompt?.hide();
  };

  context.maybeShowNextEpisodePrompt = () => {
    if (!context.nextEpisodePrompt || !episodeBrowser?.context) return;

    const currentEpisodeId = episodeBrowser.context.currentEpisodeId;
    if (!nextEpisodeGate.shouldTrigger(currentEpisodeId)) return;
    if (watchParty?.enabled && watchParty.isNextEpisodeCancelled?.()) return;

    const duration = context.knownDuration || player.duration;
    const outro = findOutro(context.segments);
    if (!shouldShowNextEpisodePrompt({ currentTime: player.currentTime, duration, outro })) return;

    const next = findNextEpisode(episodeBrowser.context, currentEpisodeId);
    if (!next) return;

    nextEpisodeGate.markShown(currentEpisodeId);
    const controls = canStartNextEpisode(watchParty);
    context.nextEpisodePrompt.show(next, {
      controls,
      message: controls ? null : NEXT_EPISODE_VIEWER_MESSAGE,
      skipAt: computeNextEpisodeTimings({ duration, outro })?.skipAt,
      getCurrentTime: () => player.currentTime
    });
  };
}
