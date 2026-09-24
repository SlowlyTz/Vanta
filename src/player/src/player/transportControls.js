import { seekBy } from '../seek.js';

// Presses closer together than this add up in one bubble ("−30 s").
export const SEEK_BUBBLE_CHAIN_MS = 900;
const SEEK_BUBBLE_VISIBLE_MS = 750;

// Running total per direction for the seek bubble: presses that follow each
// other quickly add up, a pause starts over.
export function createSeekTally({ now = () => performance.now(), chainMs = SEEK_BUBBLE_CHAIN_MS } = {}) {
  const last = { back: { at: -Infinity, total: 0 }, forward: { at: -Infinity, total: 0 } };
  return {
    add(direction, seconds) {
      const entry = last[direction];
      const current = now();
      entry.total = current - entry.at <= chainMs ? entry.total + seconds : seconds;
      entry.at = current;
      const other = direction === 'back' ? last.forward : last.back;
      other.at = -Infinity;
      return entry.total;
    }
  };
}

export function formatSeekBubble(direction, seconds, by = null) {
  const text = `${direction === 'back' ? '−' : '+'}${seconds} s`;
  return by ? `${text} · ${by}` : text;
}

export function bindTransportControls(context) {
  const { player, dom, listen, root, ui } = context;
  const tally = createSeekTally();
  const bubbleTimers = { back: null, forward: null };

  const syncPlayState = () => {
    const paused = Boolean(player.paused);
    root.toggleAttribute('data-paused', paused);
    dom.playButtons.forEach(button => {
      button.dataset.state = paused ? 'paused' : 'playing';
      button.setAttribute('aria-label', paused ? 'Wiedergabe' : 'Pause');
      button.title = paused ? 'Wiedergabe (K)' : 'Pause (K)';
    });
  };

  const showBubble = (direction, seconds, by = null) => {
    const bubble = dom.seekBubbles[direction];
    if (!bubble) return;
    bubble.textContent = formatSeekBubble(direction, seconds, by);
    bubble.classList.remove('is-visible');
    // Restart the pop animation on every press.
    void bubble.offsetWidth;
    bubble.classList.add('is-visible');
    window.clearTimeout(bubbleTimers[direction]);
    bubbleTimers[direction] = window.setTimeout(() => bubble.classList.remove('is-visible'), SEEK_BUBBLE_VISIBLE_MS);
  };

  const animateButtons = direction => {
    dom.seekButtons
      .filter(button => (Number(button.dataset.seek) < 0 ? 'back' : 'forward') === direction)
      .forEach(button => {
        button.classList.remove('is-pressed');
        void button.offsetWidth;
        button.classList.add('is-pressed');
      });
  };

  // Steps taken since the last `seeked` add up: quick presses often end in a
  // single seeked event, and the watch party reports the whole jump with it.
  context.pendingSeekStep = 0;
  context.takePendingSeekStep = () => {
    const step = context.pendingSeekStep;
    context.pendingSeekStep = 0;
    return step || null;
  };

  context.seekStep = step => {
    if (context.watchParty?.enabled && !context.canControlWatchParty()) return;
    seekBy(player, step, { endEpsilon: 0.25 });
    context.pendingSeekStep += step;
    const direction = step < 0 ? 'back' : 'forward';
    showBubble(direction, tally.add(direction, Math.abs(step)));
    animateButtons(direction);
    ui.resetIdle();
  };

  // Someone else in the party jumped: the same bubble and icon spin, with
  // their name, so everyone sees what just happened.
  context.showSeekFeedback = (step, { by = null } = {}) => {
    const seconds = Math.round(Number(step) || 0);
    if (!seconds) return;
    const direction = seconds < 0 ? 'back' : 'forward';
    showBubble(direction, tally.add(direction, Math.abs(seconds)), by);
    animateButtons(direction);
  };

  context.togglePlay = () => {
    if (context.watchParty?.enabled && !context.canControlWatchParty()) return;
    if (player.paused) player.play().catch(() => {});
    else player.pause();
  };

  dom.playButtons.forEach(button => listen(button, 'click', event => {
    event.stopPropagation();
    context.togglePlay();
  }));

  dom.seekButtons.forEach(button => listen(button, 'click', event => {
    event.stopPropagation();
    context.seekStep(Number(button.dataset.seek) || 0);
  }));

  ['play', 'pause', 'playing', 'ended', 'source-change'].forEach(event => listen(player, event, syncPlayState));
  syncPlayState();

  // Controls stay up while the pointer rests on them.
  root.querySelectorAll('.vanta-player-topbar, .vanta-player-bottom-controls').forEach(area => {
    listen(area, 'pointerenter', event => {
      if (event.pointerType === 'mouse') ui.holdActive('hover');
    });
    listen(area, 'pointerleave', () => ui.releaseActive('hover'));
  });

  context.disposers.push(() => {
    window.clearTimeout(bubbleTimers.back);
    window.clearTimeout(bubbleTimers.forward);
  });

  return context;
}
