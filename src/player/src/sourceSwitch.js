import { once } from './promiseHelpers.js';
import { createSourceSwitchState, createStateAccessors } from './sourceSwitch/state.js';
import { applyPlaybackState, syncPlayingState } from './sourceSwitch/loadingStatus.js';
import { waitForDurationOrSeekable, clearSeekTimer, startSeekTimer, performSeek } from './sourceSwitch/seekRestore.js';
import { createSwitchTo } from './sourceSwitch/rollback.js';

// vidstack's video provider only takes the types in its VIDEO_TYPES list
// (mp4, webm, 3gp, ogg, avi, mpeg); a source of any other type finds no
// provider and never loads. MKV and MOV therefore go out as MP4 and the
// browser decides from the bytes whether it plays them (a TV plays MKV).
// Only a file played as it is (DirectPlay) names its own container;
// anything Jellyfin remuxes or transcodes over HTTP is MP4.
const DIRECT_TYPES = { webm: 'video/webm' };
export const HLS_TYPE = 'application/vnd.apple.mpegurl';

// A direct source the browser or vidstack cannot open often never reports
// an error; without `can-play` by then it falls back to HLS.
export const DIRECT_CAN_PLAY_TIMEOUT_MS = 20_000;

const directType = playback => {
  if (playback.playMethod && playback.playMethod !== 'DirectPlay') return 'video/mp4';
  const container = String(playback.container || '').split(',')[0].trim().toLowerCase();
  return DIRECT_TYPES[container] || 'video/mp4';
};

export const playbackSource = playback => ({
  src: playback.url,
  type: playback.delivery === 'hls' ? HLS_TYPE : directType(playback)
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
      position: Number.isFinite(Number(loadOptions.position)) && loadOptions.position !== null
        ? Math.max(0, Number(loadOptions.position))
        : previousState.position,
      shouldPlay: loadOptions.shouldPlay !== false,
      label: loadOptions.label || 'Video wird geladen …'
    };

    state.switching = true;
    clearSeekTimer(state);
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
      await once(state.player, 'can-play', playback.delivery === 'hls' ? undefined : DIRECT_CAN_PLAY_TIMEOUT_MS, ['error']);
      if (!state.isCurrentLoad(version)) return;
      state.setLoadingStatus('Medienquelle ist bereit. Laufzeit wird geprüft …');
      state.restoreState(nextState);
      await waitForDurationOrSeekable(state.player, 3_000);
      if (!state.isCurrentLoad(version)) return;
      await performSeek(state, nextState.position, { version });
      if (!state.isCurrentLoad(version)) return;
      await applyPlaybackState(state, { shouldPlay: nextState.shouldPlay });
      if (!state.isCurrentLoad(version)) return;
      finalizeSwitch(version, { success: true });
    } catch (error) {
      finalizeSwitch(version, { success: false });
      throw error;
    }
  };

  state.loadPlayback = loadPlayback;
  const switchTo = createSwitchTo(state);

  // `quiet` starts without the loading cover, for a watch-party start where
  // the source is already buffered and the countdown hands over to the video.
  const startCurrentPlayback = async ({ quiet = false } = {}) => {
    if (!state.currentPlayback) {
      await state.player.play();
      return;
    }

    const version = state.loadVersion;
    state.switching = true;
    clearSeekTimer(state);
    if (!quiet) {
      state.setLoading(true, 'Wiedergabe wird gestartet …');
      state.ui.setState('booting');
    }
    state.setInlineLoading(false);

    try {
      await applyPlaybackState(state, { shouldPlay: true });
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
