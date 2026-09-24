// The small spinner in the middle while seeking or buffering. It stays until
// playback really goes on, not just until the browser reports `seeked`:
// that fires as soon as one frame at the target can be decoded, and with HLS
// the video often stalls again right after.

const HAVE_CURRENT_DATA = 2;
const HAVE_FUTURE_DATA = 3;
export const READY_BUFFER_SECONDS = 1;
export const SLOW_AFTER_MS = 6_000;
const CHECK_INTERVAL_MS = 100;
const END_EPSILON_SECONDS = 0.5;
// currentTime must move by this much before playback counts as running.
const PROGRESS_EPSILON_SECONDS = 0.05;

// Pure readiness rule. `anchorTime` is where the video stood when it last
// became ready to move (the seek target, or where it stalled).
export function isPlaybackReady({ element, bufferedAhead = 0, anchorTime = 0 }) {
  if (!element) return true;
  if (element.seeking) return false;
  if (element.paused) return element.readyState >= HAVE_CURRENT_DATA;
  const nearEnd = Number.isFinite(element.duration) && element.currentTime >= element.duration - END_EPSILON_SECONDS;
  const buffered = bufferedAhead >= READY_BUFFER_SECONDS || nearEnd;
  const moving = element.currentTime > anchorTime + PROGRESS_EPSILON_SECONDS;
  return element.readyState >= HAVE_FUTURE_DATA && buffered && moving;
}

export function createInlineLoadingWatch({ getVideo, getBufferedAhead, isSwitching = () => false, setVisible, setSlow = () => {} }) {
  let timer = null;
  let startedAt = 0;
  let anchorTime = 0;
  let slow = false;

  const stop = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    if (slow) setSlow(false);
    slow = false;
  };

  const check = () => {
    if (timer === null) return;
    // A source switch shows the full loading cover and handles the spinner.
    if (isSwitching()) {
      stop();
      return;
    }
    const element = getVideo();
    if (element?.seeking || element?.paused) anchorTime = Number(element.currentTime) || 0;
    if (isPlaybackReady({ element, bufferedAhead: Number(getBufferedAhead?.()) || 0, anchorTime })) {
      stop();
      setVisible(false);
      return;
    }
    if (!slow && performance.now() - startedAt >= SLOW_AFTER_MS) {
      slow = true;
      setSlow(true);
    }
  };

  return {
    // Seeking or stalled: show the spinner and watch until playback goes on.
    begin() {
      const element = getVideo();
      anchorTime = Number(element?.currentTime) || 0;
      if (timer === null) {
        startedAt = performance.now();
        timer = window.setInterval(check, CHECK_INTERVAL_MS);
      }
      setVisible(true);
    },
    // An event hinting that playback may be ready (seeked, playing).
    check,
    // Hide right away (paused by the user, error, teardown).
    end() {
      const active = timer !== null;
      stop();
      if (active) setVisible(false);
    },
    isActive: () => timer !== null
  };
}
