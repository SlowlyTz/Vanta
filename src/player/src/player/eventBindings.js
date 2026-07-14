import Hls from 'hls.js';
import { isHLSProvider } from 'vidstack';
import { exitPictureInPicture, supportsFinePointer } from '../platform.js';
import { seekBy } from '../seek.js';
import { HLS_FRAGMENT_TIMEOUT_MS, WHEEL_SEEK_DEBOUNCE_MS } from './markup.js';

export function bindPlayerEvents(context) {
  const { player, dom, listen, watchParty, onBack } = context;

  const handlePlaybackFailure = async error => {
    if (context.sourceSwitch.isSwitching() || context.destroyed) return;
    if (context.sourceSwitch.getCurrentPlayback()?.delivery !== 'hls') {
      await switchToHls(error, { silent: context.isDeferredReadyRoom() });
      return;
    }
    context.showError(error?.message);
  };

  const switchToHls = async (reason, { silent = false } = {}) => {
    if (context.fallbackAttempted || context.destroyed) {
      if (!silent) context.showError(reason?.message);
      return;
    }
    context.fallbackAttempted = true;
    const state = context.sourceSwitch.captureState();
    context.setLoading(true, 'HLS-Fallback wird beim Server angefragt …');

    try {
      const hlsPlayback = await context.resolvePlayback('hls');
      if (context.destroyed) return;
      await context.sourceSwitch.loadPlayback(hlsPlayback, {
        position: state.position,
        shouldPlay: silent ? false : state.shouldPlay,
        label: 'Stream wird gewechselt …'
      });
      context.updateMenus(hlsPlayback);
    } catch (error) {
      if (context.destroyed) return;
      if (!silent) context.showError(error.message);
    }
  };

  const enterBufferingState = () => {
    if (context.sourceSwitch.isSwitching() || context.destroyed) return;
    context.ui.setState('buffering');
    context.setInlineLoading(true);
  };

  const handleWheel = event => {
    if (watchParty?.enabled && !context.canControlWatchParty()) return;
    if (!supportsFinePointer() || Math.abs(event.deltaY) < 4) return;
    const now = performance.now();
    if (now - context.lastWheelSeekAt < WHEEL_SEEK_DEBOUNCE_MS) return;
    context.lastWheelSeekAt = now;
    event.preventDefault();
    const direction = event.deltaY > 0 ? 10 : -10;
    seekBy(player, direction, { endEpsilon: 0.25 });
  };

  listen(player, 'provider-change', event => {
    context.syncInlinePlayback();
    window.setTimeout(context.syncInlinePlayback, 0);
    if (isHLSProvider(event.detail)) {
      event.detail.library = Hls;
      event.detail.config = {
        enableWorker: true,
        backBufferLength: 30,
        manifestLoadingTimeOut: 30_000,
        levelLoadingTimeOut: 30_000,
        fragLoadingTimeOut: HLS_FRAGMENT_TIMEOUT_MS,
        fragLoadingMaxRetry: 2,
        fragLoadingRetryDelay: 1_000,
        fragLoadingMaxRetryTimeout: 10_000
      };
      if (context.sourceSwitch.isSwitching()) context.setLoadingStatus('HLS-Wiedergabe wird initialisiert …');
    }
  });
  listen(player, 'can-play', context.syncInlinePlayback);
  listen(player, 'loaded-metadata', context.syncInlinePlayback);

  listen(player, 'error', event => {
    if (context.sourceSwitch.isSwitching() || context.destroyed) return;
    const detail = event.detail || {};
    const message = detail.message || 'Medienfehler';
    const isFatalCode = detail.code >= 2 && detail.code <= 4;
    if (isFatalCode || /not supported|decode|network|media_err/i.test(message)) {
      handlePlaybackFailure(new Error(message));
    }
  });

  listen(player, 'duration-change', event => {
    const duration = Number(event.detail);
    if (Number.isFinite(duration) && duration > 0) context.knownDuration = duration;
  });

  listen(player, 'time-update', context.maybeShowNextEpisodePrompt);

  listen(player, 'play', () => {
    if (!context.sourceSwitch.isSwitching()) context.sourceSwitch.setIntendsToPlay(true);
  });

  listen(player, 'pause', () => {
    if (!context.sourceSwitch.isSwitching()) {
      context.sourceSwitch.setIntendsToPlay(false);
      context.sourceSwitch.clearSeekTimer();
      context.setInlineLoading(false);
      context.ui.setState('ready-paused');
    }
  });

  listen(player, 'waiting', () => {
    if (!context.sourceSwitch.isSwitching()) enterBufferingState();
  });

  listen(player, 'seeking', () => {
    if (!context.sourceSwitch.isSwitching()) {
      context.ui.setState('seeking');
      context.setInlineLoading(true);
      context.sourceSwitch.startSeekTimer();
    }
  });

  listen(player, 'playing', () => {
    context.sourceSwitch.clearSeekTimer();
    if (!context.sourceSwitch.isSwitching()) {
      context.sourceSwitch.setAutoplayBlocked(false);
      context.setLoading(false);
      context.setInlineLoading(false);
      context.sourceSwitch.syncPlayingState();
    }
  });

  listen(player, 'seeked', () => {
    context.sourceSwitch.clearSeekTimer();
    if (!context.sourceSwitch.isSwitching() && !context.destroyed) {
      context.setInlineLoading(false);
      context.sourceSwitch.syncPlayingState();
    }
  });

  listen(player, 'play', () => {
    if (context.canEmitOwnerControl()) {
      watchParty.onOwnerPlay?.(Math.round(player.currentTime * 1000));
    }
  });

  listen(player, 'pause', () => {
    if (context.canEmitOwnerControl()) {
      watchParty.onOwnerPause?.(Math.round(player.currentTime * 1000));
    }
  });

  listen(player, 'seeked', () => {
    if (context.canEmitOwnerControl()) {
      watchParty.onOwnerSeek?.(Math.round(player.currentTime * 1000));
    }
  });

  listen(player, 'ended', () => {
    exitPictureInPicture().catch(() => {});
    context.reporter.stop({ ended: true });
  });
  listen(player, 'wheel', handleWheel, { passive: false });
  listen(dom.backButton, 'click', onBack);

  context.switchToHls = switchToHls;

  return context;
}
