// Start and teardown: the first source, and the controller handed to the page.

import { exitPictureInPicture, exitInlineFullscreen } from '../platform.js';
import { exitSmartphoneFullscreen } from '../orientation.js';
import { NEXT_EPISODE_VIEWER_MESSAGE } from './markup.js';

// A resolved stream that will not be played: its server slot is freed.
export function cancelUnusedPlayback(context, playback) {
  if (!playback?.playSessionId || typeof context.reportPlayback !== 'function') return;
  Promise.resolve(context.reportPlayback('cancel', {
    itemId: context.itemId,
    playSessionId: playback.playSessionId,
    positionTicks: 0
  }, { keepalive: true })).catch(() => {});
}

export async function preparePlayerInitialPlayback(context) {
  const { watchParty, resumePosition } = context;

  let initialPlaybackPrepared = false;
  let initialPlaybackPromise = null;

  async function prepareInitialPlayback({ position = resumePosition } = {}) {
    if (initialPlaybackPrepared) return;
    if (initialPlaybackPromise) return initialPlaybackPromise;

    // Loading a fresh source can fire play/pause/seeked events of its own,
    // outside the echo tokens the sync books. Without this the owner's own
    // start would go to the party as manual OWNER_PLAY/OWNER_SEEK commands.
    const suppressOwnerEcho = Boolean(watchParty?.enabled);
    if (suppressOwnerEcho) context.beginOwnerEchoSuppression();

    initialPlaybackPromise = (async () => {
      const bootShouldPlay = !watchParty?.enabled;
      context.setLoading(true, 'Wiedergabequelle wird beim Server angefragt …');
      const initialPlayback = await context.resolvePlayback('auto');
      if (context.destroyed) {
        // Left while the server was asked: nobody else knows this session.
        cancelUnusedPlayback(context, initialPlayback);
      } else {
        await context.sourceSwitch.loadPlayback(initialPlayback, {
          position,
          shouldPlay: bootShouldPlay,
          isBoot: true
        });
        context.updateMenus(initialPlayback, { preserveSubtitleSelection: false });
        initialPlaybackPrepared = true;
      }
    })();

    try {
      await initialPlaybackPromise;
    } catch (error) {
      initialPlaybackPromise = null;
      if (!context.destroyed && context.handleFatalPlaybackError(error)) {
        if (suppressOwnerEcho) context.endOwnerEchoSuppression();
        throw error;
      }
      if (!context.destroyed) {
        if (context.sourceSwitch.getCurrentPlayback()?.delivery !== 'hls') {
          await context.switchToHls(error, { silent: context.isDeferredReadyRoom() });
          if (!context.destroyed && context.sourceSwitch.getCurrentPlayback()) {
            initialPlaybackPrepared = true;
            if (suppressOwnerEcho) context.endOwnerEchoSuppression();
            return;
          }
        }
        if (!context.isDeferredReadyRoom()) context.showError(error);
      }
      if (suppressOwnerEcho) context.endOwnerEchoSuppression();
      throw error;
    }

    if (suppressOwnerEcho) context.endOwnerEchoSuppression();
    return initialPlaybackPromise;
  }

  context.prepareInitialPlayback = prepareInitialPlayback;

  if (context.deferInitialLoad) {
    context.setLoading(false);
  } else {
    try {
      await prepareInitialPlayback({ position: resumePosition });
    } catch {
      // The error is shown by prepareInitialPlayback.
    }
  }

  return context;
}

export function createPlayerController(context) {
  const { player, watchParty, isPhone, root } = context;

  return {
    player,
    prepareInitialPlayback: context.prepareInitialPlayback,
    updateWatchPartyAccess: nextState => {
      if (!watchParty?.enabled) return;
      Object.assign(watchParty, nextState || {});
      context.refreshWatchPartyControlAccess();
      context.settings?.refresh();
      context.nextEpisodePrompt?.setControls(Boolean(watchParty.canControl), NEXT_EPISODE_VIEWER_MESSAGE);
    },
    cancelNextEpisode: () => context.cancelNextEpisode?.(),
    getSyncState: context.getSyncState,
    getBufferedAhead: context.getBufferedAhead,
    getLoadProgress: context.getLoadProgress,
    setSyncRate: context.setSyncRate,
    syncSeek: context.syncSeek,
    syncPlay: context.syncPlay,
    syncPause: context.syncPause,
    unlockPlayback: context.unlockPlayback,
    showSeekFeedback: context.showSeekFeedback,
    destroy: () => {
      if (context.destroyed) return Promise.resolve();
      context.destroyed = true;
      context.sourceSwitch.clearSeekTimer();
      context.echoTokens.clear();

      // The final report starts before the reporter is torn down.
      const stopPromise = context.reporter.stop({ keepalive: true });

      // Leave picture-in-picture while the <video> still exists.
      const pipPromise = exitPictureInPicture().catch(() => {});

      exitInlineFullscreen(root);
      context.reporter.destroy();
      context.subtitleMenu.destroy();
      context.settings?.destroy();
      context.mediaSession?.destroy();
      context.help?.destroy();
      context.nextEpisodePrompt?.destroy();
      context.ui.destroy();
      context.disposers.splice(0).forEach(dispose => dispose());
      player.destroy?.();
      root.innerHTML = '';

      // A caller that requests a new stream right away (next episode) awaits
      // this, so the server frees the stream slot before the next is taken.
      return Promise.all([
        isPhone ? exitSmartphoneFullscreen().catch(() => {}) : Promise.resolve(),
        pipPromise,
        stopPromise?.catch(() => {})
      ]).catch(() => {});
    }
  };
}
