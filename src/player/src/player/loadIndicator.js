import { createLoadProgressTracker, formatLoadProgress } from '../loadProgress.js';

const TICK_MS = 250;

// Shows the real loading progress ("63 % · noch ca. 3 s") on the loading
// cover and under the seek/buffer spinner while either is visible.
export function bindLoadIndicator(context) {
  const { dom, player, listen } = context;
  const tracker = createLoadProgressTracker();
  let fragment = null;
  let timer = null;
  let slow = false;
  let coverVisible = false;
  let inlineVisible = false;
  // While the cover is up for a new source (audio track, quality), the old
  // source's buffer says nothing about the new one until it is attached.
  let staleBuffer = false;

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
  listen(player, 'source-change', () => {
    fragment = null;
    staleBuffer = false;
  });

  const measure = () => tracker.update({
    bufferedAhead: staleBuffer ? 0 : Number(context.getBufferedAhead?.()) || 0,
    fragment,
    position: Number(player.currentTime) || 0,
    duration: Number(player.duration)
  });

  const render = () => {
    const progress = measure();
    const text = progress.phase === 'done' ? '' : formatLoadProgress(progress);

    if (dom.loadingProgress) {
      dom.loadingProgress.hidden = !coverVisible || !text;
      dom.loadingProgressText.textContent = text;
      dom.loadingProgressBar.style.transform = `scaleX(${progress.phase === 'preparing' ? 0 : progress.fraction})`;
      dom.loadingProgress.classList.toggle('is-preparing', progress.phase === 'preparing');
    }
    if (dom.inlineLabel) {
      const label = slow
        ? ['Lädt länger als üblich …', progress.phase === 'loading' ? text : ''].filter(Boolean).join(' · ')
        : (progress.phase === 'loading' ? text : '');
      dom.inlineLabel.textContent = label;
      dom.inlineLabel.hidden = !inlineVisible || !label;
    }
  };

  const sync = () => {
    const active = coverVisible || inlineVisible;
    if (active && timer === null) {
      tracker.reset();
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
    return preload.tracker.update({
      bufferedAhead: Number(context.getBufferedAhead?.(position)) || 0,
      fragment,
      position,
      duration: Number(player.duration)
    });
  };
}
