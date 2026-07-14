import { createQualityMenu } from '../quality.js';
import { createSubtitleMenu } from '../subtitles.js';
import { createWatchPartyParticipantsMenu } from '../watchPartyParticipants.js';
import { createEpisodeBrowser } from '../episodes.js';
import { findNextEpisode, shouldShowNextEpisodePrompt, canStartNextEpisode, createNextEpisodeGate } from '../nextEpisode.js';
import { createNextEpisodePrompt } from '../nextEpisodePrompt.js';
import { NEXT_EPISODE_THRESHOLD, NEXT_EPISODE_VIEWER_MESSAGE } from './markup.js';

export function bindMenus(context) {
  const { root, player, reporter, watchParty, episodeBrowser } = context;

  const menuButtonContainer = root.querySelector('.vanta-player-controls-right');
  const menuOverlayContainer = root.querySelector('.vanta-player-shell');
  context.menuButtonContainer = menuButtonContainer;
  context.menuOverlayContainer = menuOverlayContainer;

  const qualityMenu = watchParty?.disableQualityMenu
    ? { update: () => {} }
    : createQualityMenu({
        buttonContainer: menuButtonContainer,
        menuContainer: menuOverlayContainer,
        onSelect: async profileId => {
          const currentPlayback = context.sourceSwitch.getCurrentPlayback();
          if (!currentPlayback) return;
          try {
            const playback = await context.resolvePlayback('auto', { qualityProfile: profileId });
            if (context.destroyed) return;
            await context.sourceSwitch.switchTo(playback, {
              position: context.sourceSwitch.captureState().position,
              shouldPlay: context.sourceSwitch.getIntendsToPlay(),
              label: 'Qualität wird gewechselt …'
            });
            if (context.destroyed) return;
            context.updateMenus(playback);
          } catch (error) {
            if (!context.destroyed) context.showError(error.message);
          }
        }
      });
  context.qualityMenu = qualityMenu;

  context.subtitleMenu = createSubtitleMenu({
    buttonContainer: menuButtonContainer,
    menuContainer: menuOverlayContainer,
    player,
    reporter
  });

  context.participantsMenu = watchParty?.enabled
    ? createWatchPartyParticipantsMenu({
        buttonContainer: menuButtonContainer,
        menuContainer: menuOverlayContainer,
        watchParty
      })
    : null;

  context.episodeBrowserMenu = episodeBrowser?.enabled
    ? createEpisodeBrowser({
        buttonContainer: menuButtonContainer,
        menuContainer: menuOverlayContainer,
        context: episodeBrowser.context,
        readonly: Boolean(episodeBrowser.readonly),
        onSelectEpisode: episodeBrowser.onSelectEpisode
      })
    : null;

  const nextEpisodeGate = createNextEpisodeGate();
  context.nextEpisodeGate = nextEpisodeGate;

  context.nextEpisodePrompt = episodeBrowser?.enabled
    ? createNextEpisodePrompt({
        root: menuOverlayContainer,
        onConfirm: next => {
          episodeBrowser.onNextEpisode?.(next);
        },
        onDismiss: () => {
          nextEpisodeGate.markDismissed(episodeBrowser.context?.currentEpisodeId);
        }
      })
    : null;

  context.maybeShowNextEpisodePrompt = () => {
    if (!context.nextEpisodePrompt || !episodeBrowser?.context) return;

    const currentEpisodeId = episodeBrowser.context.currentEpisodeId;
    if (!nextEpisodeGate.shouldTrigger(currentEpisodeId)) return;
    if (!shouldShowNextEpisodePrompt({
      currentTime: player.currentTime,
      duration: context.knownDuration || player.duration,
      threshold: NEXT_EPISODE_THRESHOLD
    })) return;

    const next = findNextEpisode(episodeBrowser.context, currentEpisodeId);
    if (!next) return;

    nextEpisodeGate.markShown(currentEpisodeId);
    const interactive = canStartNextEpisode(watchParty);
    context.nextEpisodePrompt.show(next, {
      interactive,
      message: interactive ? null : NEXT_EPISODE_VIEWER_MESSAGE
    });
  };

  context.updateMenus = (playback, options = {}) => {
    qualityMenu.update(playback.quality.profiles, playback.quality.current);
    context.subtitleMenu.update(playback, {
      preserveSelection: options.preserveSubtitleSelection !== false
    });
  };

  return context;
}
