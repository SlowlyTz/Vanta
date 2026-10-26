// The keys of TV remotes, made comparable: arrows, OK, Back and the media
// keys arrive with different names and codes on Tizen, webOS, Android TV and
// a keyboard. Returns null for anything else.
const BY_KEY = {
  ArrowUp: 'up', Up: 'up',
  ArrowDown: 'down', Down: 'down',
  ArrowLeft: 'left', Left: 'left',
  ArrowRight: 'right', Right: 'right',
  Enter: 'ok', Accept: 'ok', Select: 'ok',
  Escape: 'back', GoBack: 'back', BrowserBack: 'back', XF86Back: 'back',
  MediaPlayPause: 'playpause',
  MediaPlay: 'play',
  MediaPause: 'pause',
  MediaStop: 'stop',
  MediaFastForward: 'ff',
  MediaRewind: 'rw',
  MediaTrackNext: 'next',
  MediaTrackPrevious: 'prev',
  ContextMenu: 'menu', Apps: 'menu', Info: 'menu', Tools: 'menu'
};

const BY_CODE = {
  37: 'left', 38: 'up', 39: 'right', 40: 'down',
  13: 'ok',
  461: 'back', // webOS
  10009: 'back', // Tizen
  10252: 'playpause', 179: 'playpause',
  415: 'play', 19: 'pause', 413: 'stop',
  417: 'ff', 412: 'rw',
  176: 'next', 177: 'prev',
  93: 'menu', 457: 'menu', // webOS Info
  10135: 'menu' // Tizen Tools
};

export function normalizeKey(event) {
  if (!event) return null;
  if (BY_KEY[event.key]) return BY_KEY[event.key];
  // Backspace is Back, except while typing (also on the on-screen keyboard,
  // which deletes with it).
  if (event.key === 'Backspace') {
    return isTypingTarget(event.target) || event.target?.closest?.('.osk') ? null : 'back';
  }
  return BY_CODE[event.keyCode] || null;
}

export function isTypingTarget(target) {
  if (!target || typeof target.closest !== 'function') return false;
  if (target.isContentEditable) return true;
  const field = target.closest('input, textarea, select');
  if (!field) return false;
  const type = (field.getAttribute('type') || 'text').toLowerCase();
  return !['checkbox', 'radio', 'button', 'submit', 'range'].includes(type);
}

// Samsung's TV runtime only sends media keys it was asked for. In the normal
// Samsung browser there is no `tizen` object; that is fine.
export function registerTizenKeys(tizen = globalThis.tizen) {
  try {
    tizen?.tvinputdevice?.registerKeyBatch?.([
      'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop', 'MediaFastForward', 'MediaRewind',
      'MediaTrackNext', 'MediaTrackPrevious', 'Tools', 'Info'
    ]);
    return Boolean(tizen?.tvinputdevice);
  } catch {
    return false;
  }
}
