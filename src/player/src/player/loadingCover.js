export const COVER_FADE_MS = 200;

// The loading cover and its status line ("› Erstes HLS-Segment wird …").
// Once the cover has faded out, the status goes back to its first line, so
// a finished start no longer reads as loading to anyone looking into the
// player (and a later cover never flashes the last start's step).
export function createLoadingCover({ dom, getLoadIndicator = () => null }) {
  const initialStatus = dom.loadingStatus.textContent;
  let resetTimer = null;

  const cancelReset = () => {
    if (resetTimer !== null) window.clearTimeout(resetTimer);
    resetTimer = null;
  };

  const setStatus = status => {
    if (status) dom.loadingStatus.textContent = status;
  };

  const setVisible = (visible, status) => {
    cancelReset();
    setStatus(status);
    dom.loading.classList.toggle('is-hidden', !visible);
    getLoadIndicator()?.setCoverVisible(visible);
    if (!visible) {
      resetTimer = window.setTimeout(() => {
        resetTimer = null;
        dom.loadingStatus.textContent = initialStatus;
      }, COVER_FADE_MS);
    }
  };

  return { setVisible, setStatus, dispose: cancelReset };
}
