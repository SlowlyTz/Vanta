import { seekTo } from '../seek.js';
import { formatClock } from '../../../public/js/shared/time.js';
import { normalizeKey } from '../../../public/js/tv/keys.js';
import { directionalScore } from '../../../public/js/tv/focusEngine.js';

// Hold a direction: every press jumps 10 s, after a second of holding 30 s,
// after three seconds 60 s. Measured in time, not in key repeats: remotes
// repeat at very different rates. The jump happens when the key is let go.
export function holdStep(heldMs) {
  if (heldMs >= 3_000) return 60;
  if (heldMs >= 1_000) return 30;
  return 10;
}

// Spooling stops a second before the end of the file: landing on the very
// end would finish the video (and start the next episode) unasked.
export function holdTargetLimit(duration) {
  return Number.isFinite(duration) && duration > 0 ? Math.max(0, duration - 1) : Infinity;
}

const COMMIT_AFTER_MS = 700;
// Prompts over the video that the remote reaches with up/down while the
// controls are hidden; they never take the focus themselves.
const PROMPT_TARGETS = [
  '.vanta-player-next-episode:not([hidden]) .vanta-player-next-episode-confirm:not([hidden])',
  '.vanta-sleep-notice:not([hidden]) .vanta-sleep-notice-cancel',
  '.vanta-player-skip-segment:not([hidden])'
];
const CONTROLS = '.vanta-player-controls-layer button:not([hidden]):not([disabled]), .vanta-player-controls-layer media-mute-button, .vanta-player-skip-segment:not([hidden])';

const visible = element => {
  if (!element?.isConnected || element.closest('[hidden]')) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

// The player on a TV, with a remote. Controls hidden: OK plays and pauses,
// left/right spool (faster when held, with the target time shown), up/down
// show the controls (or first reach a prompt over the video: next episode,
// sleep timer, "Intro überspringen"; prompts never take the focus by
// themselves). Controls shown: the arrows move between the buttons.
// Media keys work always; Back is left to the app (it leaves the player)
// unless a menu is open. Watch-party viewers without rights only get the
// controls and the settings.
export function bindTvControls(context, { doc = document } = {}) {
  if (!context.tvMode) return null;
  const { root, player, ui, listen } = context;
  root.classList.add('is-tv');

  const mayControl = () => !context.watchParty?.enabled || context.canControlWatchParty();
  const preview = doc.createElement('div');
  preview.className = 'vanta-tv-seek-preview';
  preview.hidden = true;
  (root.querySelector('.vanta-player-shell') || root).appendChild(preview);

  let hold = null; // { direction, startedAt, target, timer }

  const commitHold = () => {
    if (!hold) return;
    const { target, timer } = hold;
    window.clearTimeout(timer);
    hold = null;
    preview.hidden = true;
    seekTo(player, target, { endEpsilon: 0.25 });
    ui.resetIdle();
  };

  const stepHold = (direction) => {
    if (!mayControl()) return;
    const limit = holdTargetLimit(Number(context.knownDuration || player.duration));
    const now = performance.now();
    if (!hold || hold.direction !== direction) {
      commitHold();
      hold = { direction, startedAt: now, target: Number(player.currentTime) || 0, timer: null };
    }
    const step = holdStep(now - hold.startedAt) * (direction === 'right' ? 1 : -1);
    hold.target = Math.min(limit, Math.max(0, hold.target + step));
    preview.textContent = `${direction === 'right' ? '»' : '«'} ${formatClock(hold.target)}`;
    preview.dataset.direction = direction;
    preview.hidden = false;
    window.clearTimeout(hold.timer);
    hold.timer = window.setTimeout(commitHold, COMMIT_AFTER_MS);
  };

  const controlsShown = () => ui.getState() !== 'ready-playing-idle';

  const focusControl = (element) => {
    element?.focus({ preventScroll: true });
    ui.resetIdle();
  };

  const promptTarget = () => PROMPT_TARGETS
    .map(selector => root.querySelector(selector))
    .find(element => element && visible(element)) || null;

  const showControls = () => {
    if (ui.getState() === 'ready-playing-idle') ui.setState('ready-playing-active');
    const play = root.querySelector('.vanta-player-play');
    focusControl(visible(play) ? play : root.querySelector(CONTROLS));
  };

  const moveFocus = (direction, scope = root) => {
    const items = [...scope.querySelectorAll(scope === root ? CONTROLS : 'button:not([hidden]):not([disabled])')].filter(visible);
    const from = doc.activeElement && items.includes(doc.activeElement) ? doc.activeElement : null;
    if (!from) {
      focusControl(items[0]);
      return items[0] || null;
    }
    const fromRect = from.getBoundingClientRect();
    let best = null;
    let bestScore = Infinity;
    for (const item of items) {
      if (item === from) continue;
      const score = directionalScore(fromRect, item.getBoundingClientRect(), direction);
      if (score < bestScore) {
        best = item;
        bestScore = score;
      }
    }
    if (best) focusControl(best);
    return best;
  };

  const onKeyDown = (event) => {
    if (context.destroyed) return;
    // A watch party's ready room: the player waits hidden behind the lobby,
    // whose own buttons ("Bereit") keep the remote.
    if (context.isDeferredReadyRoom?.()) return;
    const name = normalizeKey(event);
    if (!name) return;

    // Menus and dialogs of the player keep their own keys; Back closes them.
    if (context.settingsOpen || context.helpOpen) {
      if (name === 'back' && event.key !== 'Escape') {
        event.preventDefault();
        if (context.settingsOpen) context.settings?.close();
        else context.toggleHelp?.();
      }
      return;
    }
    if (name === 'back') return;

    // A prompt over the video (next episode, still watching, sleep timer):
    // the arrows move between its buttons, OK presses one.
    const prompt = doc.activeElement?.closest?.('.vanta-player-next-episode, .vanta-still-watching, .vanta-sleep-notice');
    if (prompt && ['up', 'down', 'left', 'right'].includes(name)) {
      event.preventDefault();
      event.stopPropagation();
      // Out of the prompt (not in the modal "Schaust du noch?"): on to the
      // controls.
      if (!moveFocus(name, prompt) && !context.stillWatchingOpen && (name === 'up' || name === 'down')) showControls();
      return;
    }
    if (prompt && name === 'ok') return;

    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    switch (name) {
      case 'playpause':
      case 'play':
      case 'pause':
        handled();
        if (!mayControl()) return;
        if (name === 'play') player.play?.();
        else if (name === 'pause') player.pause?.();
        else context.togglePlay();
        ui.resetIdle();
        return;
      case 'stop':
        handled();
        context.onBack?.();
        return;
      case 'ff':
      case 'rw':
        handled();
        context.seekStep?.(name === 'ff' ? 30 : -30);
        return;
      default:
    }

    // A failed start ("Erneut versuchen" / "Zurück"): OK presses the button,
    // the arrows go between the two.
    const problemButton = doc.activeElement?.closest?.('.vanta-player-loading-problem-actions button');
    if (problemButton) {
      if (name === 'ok') return;
      if (['up', 'down', 'left', 'right'].includes(name)) {
        handled();
        const buttons = [...problemButton.parentElement.querySelectorAll('button')].filter(visible);
        const step = name === 'left' || name === 'up' ? -1 : 1;
        const next = buttons[buttons.indexOf(problemButton) + step];
        if (next) next.focus({ preventScroll: true });
      }
      return;
    }

    if (!controlsShown()) {
      handled();
      if (name === 'ok') {
        if (mayControl()) context.togglePlay();
        else showControls();
      } else if (name === 'left' || name === 'right') {
        if (mayControl()) stepHold(name);
        else showControls();
      } else {
        // A prompt over the video is reached first, then the controls.
        const target = promptTarget();
        if (target && doc.activeElement !== target) focusControl(target);
        else showControls();
      }
      return;
    }

    const onControl = doc.activeElement?.matches?.(CONTROLS);
    if (['up', 'down', 'left', 'right'].includes(name)) {
      handled();
      if (!onControl) showControls();
      else moveFocus(name);
      return;
    }
    // OK on a focused control is its own click; elsewhere it plays/pauses.
    if (name === 'ok' && !onControl) {
      handled();
      if (mayControl()) context.togglePlay();
      ui.resetIdle();
    }
  };

  const onKeyUp = (event) => {
    const name = normalizeKey(event);
    if (hold && (name === 'left' || name === 'right')) commitHold();
  };

  listen(doc, 'keydown', onKeyDown, true);
  listen(doc, 'keyup', onKeyUp, true);

  context.disposers.push(() => {
    if (hold) window.clearTimeout(hold.timer);
    preview.remove();
  });
  return { stepHold, commitHold };
}
