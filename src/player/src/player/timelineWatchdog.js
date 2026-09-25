export const TIMELINE_CHECK_MS = 500;
export const TIMELINE_MAX_LAG_SECONDS = 1;

// vidstack moves its time slider and clock from its own store, which a
// requestAnimationFrame loop fills while the video plays. At the start of a
// watch party that store has been seen standing still while the video played
// on. Twice a second this compares the store with the <video> and hands it the
// real time when they drift apart; the first time, it logs the store's state so
// the cause can be traced in the browser console.
export function bindTimelineWatchdog(context, { setTimer = (fn, ms) => window.setInterval(fn, ms), clearTimer = id => window.clearInterval(id) } = {}) {
  const { player } = context;
  let reported = false;

  const check = () => {
    const video = player.querySelector?.('video');
    const store = player.$store;
    if (!video || typeof store?.currentTime?.set !== 'function') return;
    if (video.paused || video.seeking || video.ended) return;

    const actual = Number(video.currentTime);
    const shown = Number(store.currentTime());
    if (!Number.isFinite(actual) || Math.abs(actual - shown) < TIMELINE_MAX_LAG_SECONDS) return;

    if (!reported) {
      reported = true;
      console.warn('[Player] Zeitleiste stand still, neu gesetzt', {
        actual,
        shown,
        storePaused: store.paused?.(),
        storePlaying: store.playing?.(),
        canPlay: store.canPlay?.(),
        seekableEnd: store.seekableEnd?.(),
        duration: store.duration?.(),
        readyState: video.readyState,
        watchPartyPhase: context.watchPartyPhase?.()
      });
    }
    store.currentTime.set(actual);
  };

  const timer = setTimer(check, TIMELINE_CHECK_MS);
  context.disposers.push(() => clearTimer(timer));
  return { check };
}
