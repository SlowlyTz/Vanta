import { once } from './promiseHelpers.js';
import { seekBy, clampSeekTarget } from './seek.js';

const LOAD_TIMEOUT_MS = 25_000;
const SEEK_TIMEOUT_MS = 6_000;
const DIRECT_FIRST_FRAME_TIMEOUT_MS = 30_000;
const HLS_FIRST_FRAME_TIMEOUT_MS = 210_000;
const HLS_FRAGMENT_TIMEOUT_MS = 90_000;
const END_EPSILON_SECONDS = 0.25;

function formatLoadingPosition(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = value % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

const playbackSource = playback => ({
  src: playback.url,
  type: playback.delivery === 'hls'
    ? 'application/vnd.apple.mpegurl'
    : 'video/mp4'
});

export function createSourceSwitch({
  player,
  reporter,
  ui,
  callbacks: {
    setLoading,
    setLoadingStatus,
    setInlineLoading,
    showError,
    hideError
  },
  onBeforeSourceChange,
  shouldPreventPlayback
}) {
  let currentPlayback = null;
  let switching = false;
  let loadVersion = 0;
  let lastRequestedPosition = 0;
  let intendsToPlay = true;
  let autoplayBlocked = false;
  let seekTimer = null;
  let seekVersion = 0;
  let lastSeekTarget = 0;

  const isCurrentLoad = version => version === loadVersion;

  const captureState = () => ({
    position: Math.max(reporter.getPosition(), lastRequestedPosition),
    shouldPlay: intendsToPlay,
    volume: Number(player.volume),
    muted: Boolean(player.muted),
    playbackRate: Number(player.playbackRate) || 1
  });

  const restoreState = state => {
    if (Number.isFinite(state.volume)) player.volume = state.volume;
    if (Number.isFinite(state.playbackRate) && state.playbackRate > 0) player.playbackRate = state.playbackRate;
    player.muted = Boolean(state.muted);
  };

  const waitForPresentedFrame = timeoutMs => new Promise(resolve => {
    const video = player.querySelector('video');
    if (!video) {
      resolve(false);
      return;
    }

    let settled = false;
    let frameId = null;
    let progressHandler = null;
    const timeout = window.setTimeout(() => finish(false), timeoutMs);

    function finish(presented) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (frameId !== null && video.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(frameId);
      }
      if (progressHandler) player.removeEventListener('time-update', progressHandler);
      resolve(presented);
    }

    if (video.requestVideoFrameCallback) {
      frameId = video.requestVideoFrameCallback(() => finish(true));
      return;
    }

    progressHandler = () => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => finish(true)));
    };
    player.addEventListener('time-update', progressHandler, { once: true });
  });

  const applyPlaybackState = async ({ shouldPlay }) => {
    if (!shouldPlay) {
      player.paused = true;
      return;
    }
    try {
      setLoadingStatus('Wiedergabe wird gestartet …');
      await player.play();
      autoplayBlocked = false;
      const isHls = currentPlayback?.delivery === 'hls';
      setLoadingStatus(isHls
        ? 'Erstes HLS-Segment wird transkodiert und geladen …'
        : 'Erster Videoframe wird dargestellt …');
      const framePresented = await waitForPresentedFrame(
        isHls ? HLS_FIRST_FRAME_TIMEOUT_MS : DIRECT_FIRST_FRAME_TIMEOUT_MS
      );
      if (!framePresented) {
        throw new Error(isHls
          ? 'Das erste HLS-Segment konnte nicht rechtzeitig geladen werden.'
          : 'Der erste Videoframe konnte nicht rechtzeitig geladen werden.');
      }
    } catch (error) {
      if (error?.name === 'NotAllowedError') {
        autoplayBlocked = true;
        setLoading(false);
        setInlineLoading(false);
      } else {
        throw error;
      }
    }
  };

  const waitForDurationOrSeekable = timeoutMs => new Promise(resolve => {
    const hasDuration = () => Number.isFinite(player.duration) && player.duration > 0;
    const hasSeekable = () => player.seekable?.length > 0 && Number.isFinite(player.seekable.end(0));

    if (hasDuration() || hasSeekable()) {
      resolve();
      return;
    }

    let timeout;
    const cleanup = () => {
      window.clearTimeout(timeout);
      player.removeEventListener('duration-change', onChange);
      player.removeEventListener('loaded-metadata', onChange);
    };

    const onChange = () => {
      if (hasDuration() || hasSeekable()) {
        cleanup();
        resolve();
      }
    };

    timeout = window.setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    player.addEventListener('duration-change', onChange);
    player.addEventListener('loaded-metadata', onChange);
  });

  const clearSeekTimer = () => {
    if (!seekTimer) return;
    window.clearTimeout(seekTimer);
    seekTimer = null;
  };

  const startSeekTimer = () => {
    clearSeekTimer();
    seekTimer = window.setTimeout(() => {
      seekTimer = null;
      if (!switching) setInlineLoading(false);
    }, SEEK_TIMEOUT_MS);
  };

  const syncPlayingState = () => {
    if (switching) return;
    ui.setState(player.paused ? 'ready-paused' : 'ready-playing-active');
  };

  const performSeek = async (targetPosition, { version } = {}) => {
    const target = clampSeekTarget(targetPosition, player, END_EPSILON_SECONDS);
    lastSeekTarget = target;
    lastRequestedPosition = target;
    const currentSeek = ++seekVersion;

    if (switching && target > 0) {
      setLoadingStatus(`Wiedergabeposition ${formatLoadingPosition(target)} wird wiederhergestellt …`);
    }

    if (Math.abs(Number(player.currentTime) - target) < 0.35) {
      if (!switching) {
        setInlineLoading(false);
        syncPlayingState();
      }
      return;
    }

    if (!switching) {
      ui.setState('seeking');
      setInlineLoading(true);
    }
    startSeekTimer();

    const seekedPromise = once(player, 'seeked', SEEK_TIMEOUT_MS);
    player.currentTime = target;

    try {
      await seekedPromise;
    } catch {
      // Seek timeout or error – still clean up below
    } finally {
      if (currentSeek !== seekVersion) return;
      clearSeekTimer();
      if (version !== undefined && !isCurrentLoad(version)) return;
      if (!switching) {
        setInlineLoading(false);
        syncPlayingState();
      }
    }
  };

  const loadPlayback = async (playback, options = {}) => {
    const version = ++loadVersion;
    const previousState = captureState();
    const state = {
      ...previousState,
      position: Math.max(0, Number(options.position) ?? previousState.position),
      shouldPlay: options.shouldPlay !== false,
      label: options.label || 'Video wird geladen …'
    };

    switching = true;
    clearSeekTimer();
    hideError();
    setLoading(true, state.label);
    setInlineLoading(false);
    ui.setState(options.isBoot ? 'booting' : 'switching-source');

    if (currentPlayback) await reporter.beforeSourceSwitch();
    if (!isCurrentLoad(version)) return;

    reporter.afterSourceSwitch();
    currentPlayback = playback;
    lastRequestedPosition = state.position;
    reporter.setPlayback(playback);

    setLoadingStatus(playback.delivery === 'hls'
      ? 'HLS-Stream wird verbunden …'
      : 'Direkter Videostream wird verbunden …');
    onBeforeSourceChange?.();
    player.src = playbackSource(playback);

    try {
      await once(player, 'can-play', LOAD_TIMEOUT_MS, ['error']);
      if (!isCurrentLoad(version)) return;
      setLoadingStatus('Medienquelle ist bereit. Laufzeit wird geprüft …');
      restoreState(state);
      await waitForDurationOrSeekable(3_000);
      if (!isCurrentLoad(version)) return;
      await performSeek(state.position, { version });
      if (!isCurrentLoad(version)) return;
      switching = false;
      const shouldPlay = state.shouldPlay && !shouldPreventPlayback?.();
      await applyPlaybackState({ shouldPlay });
      if (!isCurrentLoad(version)) return;
      if (!switching) {
        setLoading(false);
        syncPlayingState();
      }
    } catch (error) {
      if (!isCurrentLoad(version)) return;
      switching = false;
      throw error;
    }
  };

  const switchTo = async (playback, options = {}) => {
    const previousPlayback = currentPlayback;
    const rollbackState = captureState();
    try {
      await loadPlayback(playback, options);
      return { success: true };
    } catch (error) {
      if (previousPlayback && previousPlayback !== currentPlayback && !options.noRollback) {
        try {
          await loadPlayback(previousPlayback, {
            ...options,
            position: rollbackState.position,
            shouldPlay: rollbackState.shouldPlay,
            label: 'Vorherige Quelle wird wiederhergestellt …'
          });
          return { success: false, error, rolledBack: true };
        } catch (rollbackError) {
          return { success: false, error, rollbackError };
        }
      }
      throw error;
    }
  };

  return {
    loadPlayback,
    switchTo,
    performSeek,
    captureState,
    restoreState,
    syncPlayingState,
    getCurrentPlayback: () => currentPlayback,
    isSwitching: () => switching,
    isCurrentLoad,
    getAutoplayBlocked: () => autoplayBlocked,
    setAutoplayBlocked: value => { autoplayBlocked = Boolean(value); },
    getIntendsToPlay: () => intendsToPlay,
    setIntendsToPlay: value => { intendsToPlay = Boolean(value); },
    getLastRequestedPosition: () => lastRequestedPosition,
    setLastRequestedPosition: value => { lastRequestedPosition = value; },
    clearSeekTimer,
    startSeekTimer
  };
}
