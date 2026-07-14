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
