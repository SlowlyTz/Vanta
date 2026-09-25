import { once } from '../promiseHelpers.js';
import { clampSeekTarget, END_EPSILON_SECONDS } from '../seek.js';
import { syncPlayingState } from './loadingStatus.js';
import { formatClock } from '../../../public/js/shared/time.js';

const SEEK_TIMEOUT_MS = 6_000;

// vidstack's <media-player> has no `duration` or `seekable` property of its
// own; both live on the <video> inside it. Reading only the player made every
// load wait out the whole timeout.
export function waitForDurationOrSeekable(player, timeoutMs) {
  return new Promise(resolve => {
    const sources = () => [player.querySelector?.('video'), player].filter(Boolean);
    const hasDuration = () => sources().some(media => Number.isFinite(media.duration) && media.duration > 0);
    const hasSeekable = () => sources().some(media => media.seekable?.length > 0 && Number.isFinite(media.seekable.end(0)));

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
}

export function clearSeekTimer(state) {
  if (!state.seekTimer) return;
  window.clearTimeout(state.seekTimer);
  state.seekTimer = null;
}

export function startSeekTimer(state) {
  clearSeekTimer(state);
  state.seekTimer = window.setTimeout(() => {
    state.seekTimer = null;
    if (!state.switching) state.setInlineLoading(false);
  }, SEEK_TIMEOUT_MS);
}

export async function performSeek(state, targetPosition, { version } = {}) {
  const { player } = state;
  const target = clampSeekTarget(targetPosition, player, END_EPSILON_SECONDS);
  state.lastRequestedPosition = target;
  const currentSeek = ++state.seekVersion;

  if (state.switching && target > 0) {
    state.setLoadingStatus(`Wiedergabeposition ${formatClock(target)} wird wiederhergestellt …`);
  }

  if (Math.abs(Number(player.currentTime) - target) < 0.35) {
    if (!state.switching) {
      state.setInlineLoading(false);
      syncPlayingState(state);
    }
    return;
  }

  if (!state.switching) {
    state.ui.setState('seeking');
    state.setInlineLoading(true);
  }
  startSeekTimer(state);

  const seekedPromise = once(player, 'seeked', SEEK_TIMEOUT_MS);
  player.currentTime = target;

  try {
    await seekedPromise;
  } catch {
    // Seek timeout or error – still clean up below
  } finally {
    if (currentSeek !== state.seekVersion) return;
    clearSeekTimer(state);
    if (version !== undefined && !state.isCurrentLoad(version)) return;
    if (!state.switching) {
      state.setInlineLoading(false);
      syncPlayingState(state);
    }
  }
}
