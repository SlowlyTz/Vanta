const DIRECT_FIRST_FRAME_TIMEOUT_MS = 30_000;
const HLS_FIRST_FRAME_TIMEOUT_MS = 210_000;

function waitForPresentedFrame(player, timeoutMs) {
  return new Promise(resolve => {
    const video = player.querySelector('video');
    if (!video) {
      resolve(false);
      return;
    }

    let settled = false;
    let frameId = null;
    let progressHandler = null;
    const timeout = window.setTimeout(() => finish(false), timeoutMs);

    // A tab in the background presents no frames (no video frame callbacks,
    // no animation frames), yet the video plays on. Time moving on the
    // <video> itself counts too, or such a tab would sit in "loading" and
    // report buffering, which makes a watch party wait for it.
    const startedAt = Number(video.currentTime) || 0;
    const onNativeTime = () => {
      if (!video.paused && Number(video.currentTime) > startedAt + 0.05) finish(true);
    };
    video.addEventListener?.('timeupdate', onNativeTime);

    function finish(presented) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.removeEventListener?.('timeupdate', onNativeTime);
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
}

export async function applyPlaybackState(state, { shouldPlay }) {
  const { player, setLoading, setLoadingStatus, setInlineLoading } = state;
  if (!shouldPlay) {
    player.paused = true;
    return;
  }
  try {
    setLoadingStatus('Wiedergabe wird gestartet …');
    await player.play();
    const video = player.querySelector('video');
    if (video?.paused) await video.play();
    state.autoplayBlocked = false;
    const isHls = state.currentPlayback?.delivery === 'hls';
    setLoadingStatus(isHls
      ? 'Erstes HLS-Segment wird transkodiert und geladen …'
      : 'Erster Videoframe wird dargestellt …');
    const framePresented = await waitForPresentedFrame(
      player,
      isHls ? HLS_FIRST_FRAME_TIMEOUT_MS : DIRECT_FIRST_FRAME_TIMEOUT_MS
    );
    if (!framePresented) {
      throw new Error(isHls
        ? 'Das erste HLS-Segment konnte nicht rechtzeitig geladen werden.'
        : 'Der erste Videoframe konnte nicht rechtzeitig geladen werden.');
    }
  } catch (error) {
    if (error?.name === 'NotAllowedError') {
      state.autoplayBlocked = true;
      setLoading(false);
      setInlineLoading(false);
    } else {
      throw error;
    }
  }
}

export function syncPlayingState(state) {
  if (state.switching) return;
  state.ui.setState(state.player.paused ? 'ready-paused' : 'ready-playing-active');
}
