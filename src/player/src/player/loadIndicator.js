import { createFirstByteHistory, createLoadProgressTracker, DEFAULT_SEGMENT_SECONDS, formatLoadProgress } from '../loadProgress.js';

const TICK_MS = 250;
const TRANSCODE_POLL_MS = 1_000;

// Shows the loading progress ("63 % · noch ca. 3 s") on the loading cover and
// under the seek/buffer spinner while either is visible. Before the first
// bytes it asks the server how far Jellyfin's transcoder got, and without
// that it estimates from earlier loads (see loadProgress.js).
export function bindLoadIndicator(context, { history = createFirstByteHistory() } = {}) {
  const { dom, player, listen } = context;
  const tracker = createLoadProgressTracker();
  let fragment = null;
  let segmentSeconds = DEFAULT_SEGMENT_SECONDS;
  let timer = null;
  let slow = false;
  let coverVisible = false;
  let inlineVisible = false;
  // While the cover is up for a new source (audio track, quality), the old
  // source's buffer says nothing about the new one until it is attached.
  let staleBuffer = false;
  let transcode = null;
  let transcodeRequest = null;
  let lastTranscodePoll = -Infinity;
  let firstByteRecorded = false;
  let waited = false;

  // vidstack re-dispatches every hls.js event on the player element.
  listen(player, 'hls-frag-loading', event => {
    if (staleBuffer) return;
    const frag = event.detail?.frag;
    if (frag && (!frag.type || frag.type === 'main')) fragment = frag;
  });
  const dropFragment = event => {
    if (!event.detail?.frag || event.detail.frag === fragment) fragment = null;
  };
  listen(player, 'hls-frag-loaded', dropFragment);
  listen(player, 'hls-frag-load-emergency-aborted', dropFragment);
  listen(player, 'hls-level-loaded', event => {
    const target = Number(event.detail?.details?.targetduration);
    if (target > 0) segmentSeconds = target;
  });
  listen(player, 'source-change', () => {
    fragment = null;
    staleBuffer = false;
    transcode = null;
  });

  const pollTranscode = () => {
    if (typeof context.loadTranscodeProgress !== 'function' || transcodeRequest) return;
    if (context.sourceSwitch?.getCurrentPlayback?.()?.isTranscoded === false) return;
    const now = performance.now();
    if (now - lastTranscodePoll < TRANSCODE_POLL_MS) return;
    lastTranscodePoll = now;
    transcodeRequest = Promise.resolve(context.loadTranscodeProgress())
      .then(result => {
        transcode = result?.available
          ? { positionSeconds: Number(result.transcodedMs) / 1000, speed: result.speed }
          : null;
      })
      .catch(() => { transcode = null; })
      .finally(() => { transcodeRequest = null; });
  };

  const inputAt = position => ({
    bufferedAhead: staleBuffer ? 0 : Number(context.getBufferedAhead?.(position)) || 0,
    fragment,
    position,
    duration: Number(player.duration),
    transcode,
    segmentSeconds,
    expectedMs: history.expectedMs()
  });

  const render = () => {
    const progress = tracker.update(inputAt(Number(player.currentTime) || 0));
    if (progress.phase === 'preparing' || progress.phase === 'transcoding') {
      waited = true;
      pollTranscode();
    } else if (waited && !firstByteRecorded) {
      // The wait until the first bytes feeds the estimate for next time.
      firstByteRecorded = true;
      history.record(tracker.elapsedMs());
    }
    const text = progress.phase === 'done' ? '' : formatLoadProgress(progress);
    const measuring = progress.phase === 'loading' || progress.phase === 'transcoding' || (progress.approx && progress.fraction > 0);

    if (dom.loadingProgress) {
      dom.loadingProgress.hidden = !coverVisible || !text;
      dom.loadingProgressText.textContent = text;
      dom.loadingProgressBar.style.transform = `scaleX(${measuring ? progress.fraction : 0})`;
      dom.loadingProgress.classList.toggle('is-preparing', !measuring);
      dom.loadingProgress.classList.toggle('is-estimate', Boolean(progress.approx));
    }
    if (dom.inlineLabel) {
      const shown = progress.phase === 'done' ? '' : text;
      const label = slow ? ['Lädt länger als üblich …', progress.phase === 'loading' ? shown : ''].filter(Boolean).join(' · ') : shown;
      dom.inlineLabel.textContent = label;
      dom.inlineLabel.hidden = !inlineVisible || !label;
    }
  };

  const sync = () => {
    const active = coverVisible || inlineVisible;
    if (active && timer === null) {
      tracker.reset();
      transcode = null;
      lastTranscodePoll = -Infinity;
      firstByteRecorded = false;
      waited = false;
      timer = window.setInterval(render, TICK_MS);
      render();
    } else if (!active && timer !== null) {
      window.clearInterval(timer);
      timer = null;
      slow = false;
      render();
    }
  };

  context.loadIndicator = {
    setCoverVisible(visible) {
      const next = Boolean(visible);
      // A cover over a playing source means a new source is on its way.
      if (next && !coverVisible && context.sourceSwitch?.getCurrentPlayback?.()) staleBuffer = true;
      if (!next) staleBuffer = false;
      coverVisible = next;
      sync();
    },
    setInlineVisible(visible) {
      inlineVisible = Boolean(visible);
      sync();
    },
    setSlow(value) {
      slow = Boolean(value);
      if (timer !== null) render();
    }
  };
  context.disposers.push(() => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  });

  // The watch-party ready room asks for the same measure at its start
  // position, with a tracker of its own.
  const preload = { tracker: createLoadProgressTracker(), position: null };
  context.getLoadProgress = (position = player.currentTime) => {
    if (preload.position !== position) {
      preload.tracker.reset();
      preload.position = position;
    }
    const progress = preload.tracker.update(inputAt(position));
    if (progress.phase === 'preparing' || progress.phase === 'transcoding') pollTranscode();
    return progress;
  };
}
