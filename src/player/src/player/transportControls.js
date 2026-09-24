import { seekBy } from '../seek.js';

export const SEEK_STEP_SECONDS = 10;
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

export function formatSeekBubble(direction, seconds) {
  return `${direction === 'back' ? '−' : '+'}${seconds} s`;
}

function isTypingTarget(target) {
  if (!target || typeof target.closest !== 'function') return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'));
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

  const showBubble = (direction, seconds) => {
    const bubble = dom.seekBubbles[direction];
    if (!bubble) return;
    bubble.textContent = formatSeekBubble(direction, seconds);
    bubble.classList.remove('is-visible');
    // Restart the pop animation on every press.
    void bubble.offsetWidth;
    bubble.classList.add('is-visible');
    window.clearTimeout(bubbleTimers[direction]);
    bubbleTimers[direction] = window.setTimeout(() => bubble.classList.remove('is-visible'), SEEK_BUBBLE_VISIBLE_MS);
  };

  context.seekStep = (step, { button = null } = {}) => {
    if (context.watchParty?.enabled && !context.canControlWatchParty()) return;
    seekBy(player, step, { endEpsilon: 0.25 });
    const direction = step < 0 ? 'back' : 'forward';
    showBubble(direction, tally.add(direction, Math.abs(step)));
    if (button) {
      button.classList.remove('is-pressed');
      void button.offsetWidth;
      button.classList.add('is-pressed');
    }
    ui.resetIdle();
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
    context.seekStep(Number(button.dataset.seek) || 0, { button });
  }));

  // The arrow keys jump the same ten seconds as the buttons and show the
  // same bubble (vidstack's own seek keys are switched off for this).
  listen(document, 'keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (isTypingTarget(event.target) || context.settingsOpen) return;
    event.preventDefault();
    context.seekStep(event.key === 'ArrowLeft' ? -SEEK_STEP_SECONDS : SEEK_STEP_SECONDS);
  });

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
