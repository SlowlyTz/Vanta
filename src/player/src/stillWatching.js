// "Schaust du noch?": after a stretch of playback without any input the
// video pauses and asks. Only playback time counts (a pause stops the
// clock), and the count survives an automatic switch to the next episode:
// the page hands the value over (`initialIdleMs`, `onIdleChange`). A watch
// party never asks; the others are still watching.

import { normalizeKey } from '../../public/js/tv/keys.js';

const TICK_MS = 1_000;

export function createIdlePlaybackCounter({ limitMs, initialMs = 0 }) {
  let idleMs = Math.max(0, Number(initialMs) || 0);
  return {
    add(ms) {
      idleMs += ms;
      return limitMs > 0 && idleMs >= limitMs;
    },
    reset() { idleMs = 0; },
    value: () => idleMs
  };
}

export function bindStillWatching(context, { setTimer = (fn, ms) => window.setInterval(fn, ms), clearTimer = id => window.clearInterval(id) } = {}) {
  const { root, player, listen } = context;
  const options = context.stillWatching || {};
  const limitMs = Number(options.afterMs) || 0;
  context.noteActivity = () => {};
  if (context.watchParty?.enabled || limitMs <= 0) return null;

  const counter = createIdlePlaybackCounter({ limitMs, initialMs: options.initialIdleMs });
  const report = () => options.onIdleChange?.(counter.value());

  const dialog = document.createElement('div');
  dialog.className = 'vanta-still-watching';
  dialog.setAttribute('role', 'alertdialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'vanta-still-watching-title');
  dialog.hidden = true;
  dialog.innerHTML = `
    <div class="vanta-still-watching-panel">
      <h2 id="vanta-still-watching-title">Schaust du noch?</h2>
      <p>Die Wiedergabe ist pausiert, weil länger nichts bedient wurde.</p>
      <div class="vanta-still-watching-actions">
        <button type="button" class="vanta-still-watching-no">Nein</button>
        <button type="button" class="vanta-still-watching-yes">Ja, weiter</button>
      </div>
    </div>`;
  (root.querySelector('.vanta-player-shell') || root).appendChild(dialog);
  const yesButton = dialog.querySelector('.vanta-still-watching-yes');
  const noButton = dialog.querySelector('.vanta-still-watching-no');

  const noteActivity = () => {
    if (context.stillWatchingOpen) return;
    counter.reset();
    report();
  };
  context.noteActivity = noteActivity;

  const open = () => {
    context.stillWatchingOpen = true;
    context.settings?.close?.({ returnFocus: false });
    player.pause();
    dialog.hidden = false;
    root.classList.add('is-still-watching');
    yesButton.focus({ preventScroll: true });
  };

  const close = () => {
    context.stillWatchingOpen = false;
    dialog.hidden = true;
    root.classList.remove('is-still-watching');
    counter.reset();
    report();
  };

  yesButton.addEventListener('click', () => {
    close();
    Promise.resolve(player.play()).catch(() => {});
  });
  noButton.addEventListener('click', () => {
    close();
    context.onBack?.();
  });

  // Playback started some other way while the dialog is open (a media key,
  // the system's media controls, the browser's tab controls) answers it
  // like "Ja".
  listen(player, 'play', () => {
    if (context.stillWatchingOpen) close();
  });

  // Input in the player is activity; the answers to the dialog are not.
  for (const type of ['pointerdown', 'mousemove', 'wheel']) listen(root, type, noteActivity, { passive: true });
  listen(document, 'keydown', noteActivity, true);

  // A TV's Back answers "Nein" instead of leaving the player behind the
  // dialog's back.
  listen(document, 'keydown', event => {
    if (!context.stillWatchingOpen || !context.tvMode || normalizeKey(event) !== 'back') return;
    event.preventDefault();
    event.stopPropagation();
    noButton.click();
  }, true);

  // While open, the dialog keeps the keys and the focus to itself: Tab goes
  // round its two buttons.
  listen(dialog, 'keydown', event => {
    event.stopPropagation();
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const buttons = [noButton, yesButton];
    const index = buttons.indexOf(document.activeElement);
    const step = event.shiftKey ? -1 : 1;
    buttons[(index + step + buttons.length) % buttons.length].focus({ preventScroll: true });
  });
  listen(document, 'focusin', event => {
    if (context.stillWatchingOpen && !dialog.contains(event.target)) yesButton.focus({ preventScroll: true });
  });

  const timer = setTimer(() => {
    if (context.destroyed || context.stillWatchingOpen || player.paused) return;
    if (counter.add(TICK_MS)) open();
    report();
  }, TICK_MS);
  context.disposers.push(() => clearTimer(timer));

  return { open, close, counter, dialog };
}
