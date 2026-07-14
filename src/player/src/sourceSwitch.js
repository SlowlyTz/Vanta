import { once } from './promiseHelpers.js';
import { createSourceSwitchState, createStateAccessors } from './sourceSwitch/state.js';
import { applyPlaybackState, syncPlayingState } from './sourceSwitch/loadingStatus.js';
import { waitForDurationOrSeekable, clearSeekTimer, startSeekTimer, performSeek } from './sourceSwitch/seekRestore.js';
import { createSwitchTo } from './sourceSwitch/rollback.js';

const playbackSource = playback => ({
  src: playback.url,
  type: playback.delivery === 'hls'
    ? 'application/vnd.apple.mpegurl'
    : 'video/mp4'
});

export function createSourceSwitch(options) {
  const state = createSourceSwitchState(options);

  const finalizeSwitch = (version, { success = false } = {}) => {
    if (!state.isCurrentLoad(version)) return;
    state.switching = false;
    if (success) {
      state.setLoading(false);
      syncPlayingState(state);
    }
  };

  const loadPlayback = async (playback, loadOptions = {}) => {
    const version = ++state.loadVersion;
    const previousState = state.captureState();
    const nextState = {
      ...previousState,
      position: Math.max(0, Number(loadOptions.position) ?? previousState.position),
      shouldPlay: loadOptions.shouldPlay !== false,
      label: loadOptions.label || 'Video wird geladen …'
    };

    state.switching = true;
    clearSeekTimer(state);
    state.hideError();
    state.setLoading(true, nextState.label);
    state.setInlineLoading(false);
    state.ui.setState(loadOptions.isBoot ? 'booting' : 'switching-source');

    if (state.currentPlayback) await state.reporter.beforeSourceSwitch();
    if (!state.isCurrentLoad(version)) return;

    state.reporter.afterSourceSwitch();
    state.currentPlayback = playback;
    state.lastRequestedPosition = nextState.position;
    state.reporter.setPlayback(playback);

    state.setLoadingStatus(playback.delivery === 'hls'
      ? 'HLS-Stream wird verbunden …'
      : 'Direkter Videostream wird verbunden …');
    state.onBeforeSourceChange?.();
    state.player.src = playbackSource(playback);

    try {
      await once(state.player, 'can-play', undefined, ['error']);
      if (!state.isCurrentLoad(version)) return;
      state.setLoadingStatus('Medienquelle ist bereit. Laufzeit wird geprüft …');
      state.restoreState(nextState);
      await waitForDurationOrSeekable(state.player, 3_000);
      if (!state.isCurrentLoad(version)) return;
      await performSeek(state, nextState.position, { version });
      if (!state.isCurrentLoad(version)) return;
      const shouldPlay = nextState.shouldPlay && !state.shouldPreventPlayback?.();
      await applyPlaybackState(state, { shouldPlay });
      if (!state.isCurrentLoad(version)) return;
      finalizeSwitch(version, { success: true });
    } catch (error) {
      finalizeSwitch(version, { success: false });
      throw error;
    }
  };

  state.loadPlayback = loadPlayback;
  const switchTo = createSwitchTo(state);

  const startCurrentPlayback = async () => {
    if (!state.currentPlayback) {
      await state.player.play();
      return;
    }

    const version = state.loadVersion;
    state.switching = true;
    clearSeekTimer(state);
    state.hideError();
    state.setLoading(true, 'Wiedergabe wird gestartet …');
    state.setInlineLoading(false);
    state.ui.setState('booting');

    try {
      const shouldPlay = !state.shouldPreventPlayback?.();
      await applyPlaybackState(state, { shouldPlay });
      if (!state.isCurrentLoad(version)) return;
      state.switching = false;
      if (!state.autoplayBlocked) {
        state.setLoading(false);
        syncPlayingState(state);
      }
    } catch (error) {
      if (state.isCurrentLoad(version)) {
        state.switching = false;
        state.setLoading(false);
      }
      throw error;
    }
  };

  return {
    loadPlayback,
    switchTo,
    startCurrentPlayback,
    performSeek: (targetPosition, seekOptions) => performSeek(state, targetPosition, seekOptions),
    captureState: state.captureState,
    restoreState: state.restoreState,
    syncPlayingState: () => syncPlayingState(state),
    ...createStateAccessors(state),
    clearSeekTimer: () => clearSeekTimer(state),
    startSeekTimer: () => startSeekTimer(state)
  };
}
