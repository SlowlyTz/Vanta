const LOCKED_CONTROL_SELECTOR = [
  'media-play-button',
  'media-seek-button',
  'media-time-slider',
  '.vanta-player-center-play',
  '.vanta-player-center-skip'
].join(', ');

const GESTURE_SELECTOR = 'media-gesture';

export function applyWatchPartyPermissions({ root, watchParty }) {
  if (!watchParty?.enabled || watchParty.isOwner) return;

  root.classList.add('is-watch-party-viewer');

  root.querySelectorAll(LOCKED_CONTROL_SELECTOR).forEach(control => {
    control.setAttribute('aria-disabled', 'true');
    control.style.pointerEvents = 'none';
  });

  root.querySelectorAll(GESTURE_SELECTOR).forEach(gesture => {
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
