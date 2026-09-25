import { exitPictureInPicture, exitInlineFullscreen } from '../platform.js';
import { exitSmartphoneFullscreen } from '../orientation.js';
import { NEXT_EPISODE_VIEWER_MESSAGE } from './markup.js';

export async function preparePlayerInitialPlayback(context) {
  const { watchParty, resumePosition } = context;

  let initialPlaybackPrepared = false;
  let initialPlaybackPromise = null;

  async function prepareInitialPlayback({ position = resumePosition } = {}) {
    if (initialPlaybackPrepared) return;
    if (initialPlaybackPromise) return initialPlaybackPromise;

    // Loading a fresh source can itself fire native play/pause/seeked events (e.g. the
    // <media-player autoplay> attribute racing with our own shouldPlay bookkeeping) well
    // outside the echo tokens the sync methods book. Without suppression here, the watch
    // party owner's own boot would get echoed back to the server as a manual OWNER_PLAY/
    // OWNER_SEEK, producing phantom notifications and bogus party-state changes.
    const suppressOwnerEcho = Boolean(watchParty?.enabled);
    if (suppressOwnerEcho) context.beginOwnerEchoSuppression();

    initialPlaybackPromise = (async () => {
      const bootShouldPlay = !watchParty?.enabled;
      context.setLoading(true, 'Wiedergabequelle wird beim Server angefragt …');
      const initialPlayback = await context.resolvePlayback('auto');
      if (!context.destroyed) {
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
        if (!context.isDeferredReadyRoom()) context.showError(error.message);
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
      // visible error handling happens in prepareInitialPlayback
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

      // Start final reporting before tearing down reporter state so keepalive can flush.
      const stopPromise = context.reporter.stop({ keepalive: true });

      // Begin PiP cleanup while the video element is still present.
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

      // Callers that immediately request a new stream (e.g. next-episode navigation) must
      // await this so the server releases the stream-limit slot before the new one is reserved.
      return Promise.all([
        isPhone ? exitSmartphoneFullscreen().catch(() => {}) : Promise.resolve(),
        pipPromise,
        stopPromise?.catch(() => {})
      ]).catch(() => {});
    }
  };
}
