// Viewers in a watch party do not steer playback: the transport (play,
// seek) is hidden and inert, the timeline only shows progress, and the
// gestures lose their actions. The top bar says who is in control instead.
const TRANSPORT_SELECTOR = '.vanta-player-transport';
// The timeline stays visible as a progress display. It must not get
// aria-hidden: vidstack hides any slider carrying it with display:none.
const TIMELINE_SELECTOR = 'media-time-slider';
const GESTURE_SELECTOR = 'media-gesture';
const ORIGINAL_GESTURE_ACTION_ATTRIBUTE = 'data-watch-party-original-action';

export function applyWatchPartyPermissions({ root, watchParty }) {
  if (!watchParty?.enabled) return;
  const canControl = Boolean(watchParty.canControl ?? watchParty.isOwner);

  root.classList.toggle('is-watch-party-viewer', !canControl);
  const pill = root.querySelector('.vanta-player-party-pill');
  if (pill) pill.hidden = canControl;

  root.querySelectorAll(TRANSPORT_SELECTOR).forEach(control => {
    control.inert = !canControl;
    if (canControl) control.removeAttribute('aria-hidden');
    else control.setAttribute('aria-hidden', 'true');
  });
  root.querySelectorAll(TIMELINE_SELECTOR).forEach(timeline => {
    timeline.inert = !canControl;
  });

  root.querySelectorAll(GESTURE_SELECTOR).forEach(gesture => {
    if (canControl) {
      const originalAction = gesture.getAttribute(ORIGINAL_GESTURE_ACTION_ATTRIBUTE);
      if (originalAction) {
        gesture.setAttribute('action', originalAction);
        gesture.removeAttribute(ORIGINAL_GESTURE_ACTION_ATTRIBUTE);
      }
      gesture.style.pointerEvents = '';
      return;
    }
    const action = gesture.getAttribute('action');
    if (action && !gesture.getAttribute(ORIGINAL_GESTURE_ACTION_ATTRIBUTE)) {
      gesture.setAttribute(ORIGINAL_GESTURE_ACTION_ATTRIBUTE, action);
    }
    gesture.removeAttribute('action');
    gesture.style.pointerEvents = 'none';
  });
}

export function computeRemoteControlTarget({ action, positionMs, serverTimeMs, playing, currentTime, now = Date.now() }) {
  const shouldPlay = action === 'play' || Boolean(playing);
  // A running timeline has moved on since its anchor, whatever the action.
  const elapsedMs = shouldPlay ? Math.max(0, now - serverTimeMs) : 0;
  const targetSeconds = Math.max(0, (positionMs + elapsedMs) / 1000);
  const shouldSeek = Math.abs(currentTime - targetSeconds) > 0.75;
  const shouldPause = !shouldPlay && action === 'pause';

  return { targetSeconds, shouldSeek, shouldPlay, shouldPause };
}
