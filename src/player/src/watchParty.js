const LOCKED_CONTROL_SELECTOR = [
  'media-play-button',
  'media-seek-button',
  'media-time-slider',
  '.vanta-player-center-play',
  '.vanta-player-center-skip'
].join(', ');

const GESTURE_SELECTOR = 'media-gesture';
const ORIGINAL_GESTURE_ACTION_ATTRIBUTE = 'data-watch-party-original-action';

export function applyWatchPartyPermissions({ root, watchParty }) {
  if (!watchParty?.enabled) return;
  const canControl = Boolean(watchParty.canControl ?? watchParty.isOwner);
  const controls = root.querySelectorAll(LOCKED_CONTROL_SELECTOR);
  const gestures = root.querySelectorAll(GESTURE_SELECTOR);

  if (canControl) {
    root.classList.remove('is-watch-party-viewer');

    controls.forEach(control => {
      control.removeAttribute('aria-disabled');
      control.removeAttribute('disabled');
      control.disabled = false;
      control.inert = false;
      control.style.pointerEvents = '';
    });

    gestures.forEach(gesture => {
      const originalAction = gesture.getAttribute(ORIGINAL_GESTURE_ACTION_ATTRIBUTE);
      if (originalAction) {
        gesture.setAttribute('action', originalAction);
        gesture.removeAttribute(ORIGINAL_GESTURE_ACTION_ATTRIBUTE);
      }
      gesture.style.pointerEvents = '';
    });
    return;
  }

  root.classList.add('is-watch-party-viewer');

  controls.forEach(control => {
    control.setAttribute('aria-disabled', 'true');
    control.inert = true;
    control.style.pointerEvents = 'none';
  });

  gestures.forEach(gesture => {
    const action = gesture.getAttribute('action');
    if (action && !gesture.getAttribute(ORIGINAL_GESTURE_ACTION_ATTRIBUTE)) {
      gesture.setAttribute(ORIGINAL_GESTURE_ACTION_ATTRIBUTE, action);
    }
    gesture.removeAttribute('action');
    gesture.style.pointerEvents = 'none';
  });
}

export function computeRemoteControlTarget({ action, positionMs, serverTimeMs, playing, currentTime }) {
  const elapsedMs = action === 'play' ? Date.now() - serverTimeMs : 0;
  const targetSeconds = Math.max(0, (positionMs + elapsedMs) / 1000);
  const shouldSeek = Math.abs(currentTime - targetSeconds) > 0.75;
  const shouldPlay = action === 'play' || Boolean(playing);
  const shouldPause = !shouldPlay && action === 'pause';

  return { targetSeconds, shouldSeek, shouldPlay, shouldPause };
}
