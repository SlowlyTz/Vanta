import { seekTo } from '../seek.js';

export const VOLUME_STEP = 0.05;
const VOLUME_BUBBLE_MS = 900;
const WHEEL_STEP_THRESHOLD = 40;
const WHEEL_SEEK_DEBOUNCE_MS = 320;

// Every keyboard and pointer control of the player in one place. `transport`
// marks what steers playback: watch-party viewers cannot use those, and the
// help overlay lists them as admin-only. The help is generated from here.
export const KEYBOARD_SHORTCUTS = [
  { id: 'toggle-play', keys: ['Leertaste', 'K'], label: 'Wiedergabe / Pause', transport: true },
  { id: 'seek-back', keys: ['←', 'J'], label: '10 Sekunden zurück', transport: true },
  { id: 'seek-forward', keys: ['→', 'L'], label: '10 Sekunden vor', transport: true },
  { id: 'volume-up', keys: ['↑'], label: 'Lauter' },
  { id: 'volume-down', keys: ['↓'], label: 'Leiser' },
  { id: 'mute', keys: ['M'], label: 'Stumm an / aus' },
  { id: 'fullscreen', keys: ['F'], label: 'Vollbild' },
  { id: 'subtitles', keys: ['C'], label: 'Untertitel an / aus' },
  { id: 'jump', keys: ['0 – 9'], label: 'Zu 0 % – 90 % springen', transport: true },
  { id: 'help', keys: ['?'], label: 'Diese Hilfe' },
  { id: 'close', keys: ['Esc'], label: 'Menü oder Hilfe schließen' }
];

export const POINTER_SHORTCUTS = [
  { id: 'click', input: 'Klick aufs Bild', label: 'Wiedergabe / Pause', transport: true, pointer: 'mouse' },
  { id: 'dblclick', input: 'Doppelklick aufs Bild', label: 'Vollbild', pointer: 'mouse' },
  { id: 'wheel-volume', input: 'Mausrad am Lautsprecher', label: 'Lautstärke', pointer: 'mouse' },
  { id: 'wheel-timeline', input: 'Mausrad an der Zeitleiste', label: '± 10 Sekunden', transport: true, pointer: 'mouse' },
  { id: 'tap', input: 'Tippen aufs Bild', label: 'Steuerung ein- / ausblenden', pointer: 'touch' },
  { id: 'double-tap', input: 'Doppeltippen links / rechts', label: '± 10 s, weiteres Tippen spult weiter', transport: true, pointer: 'touch' }
];

// Maps a key event to a shortcut id (or null). Letters ignore case.
export function shortcutForKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const key = event.key;
  if (key === ' ' || key === 'Spacebar' || key === 'k' || key === 'K') return 'toggle-play';
  if (key === 'ArrowLeft' || key === 'j' || key === 'J') return 'seek-back';
  if (key === 'ArrowRight' || key === 'l' || key === 'L') return 'seek-forward';
  if (key === 'ArrowUp') return 'volume-up';
  if (key === 'ArrowDown') return 'volume-down';
  if (key === 'm' || key === 'M') return 'mute';
  if (key === 'f' || key === 'F') return 'fullscreen';
  if (key === 'c' || key === 'C') return 'subtitles';
  if (key === '?') return 'help';
  if (/^[0-9]$/.test(key)) return 'jump';
  return null;
}

function isTypingTarget(target) {
  if (!target || typeof target.closest !== 'function') return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'));
}

export function bindShortcuts(context) {
  const { player, root, listen, ui, dom } = context;
  let volumeTimer = null;
  let wheelVolume = 0;
  let lastWheelSeekAt = 0;

  const mayControl = () => !context.watchParty?.enabled || context.canControlWatchParty();

  const showVolume = () => {
    const bubble = dom.volumeBubble;
    if (!bubble) return;
    const level = player.muted ? 0 : Math.round((Number(player.volume) || 0) * 100);
    bubble.style.setProperty('--level', String(level / 100));
    bubble.querySelector('.vanta-player-volume-bubble-value').textContent = player.muted ? 'Stumm' : `${level} %`;
    bubble.dataset.level = player.muted || level === 0 ? 'mute' : level < 50 ? 'low' : 'high';
    bubble.classList.add('is-visible');
    window.clearTimeout(volumeTimer);
    volumeTimer = window.setTimeout(() => bubble.classList.remove('is-visible'), VOLUME_BUBBLE_MS);
  };

  context.adjustVolume = delta => {
    const next = Math.min(1, Math.max(0, Math.round(((Number(player.volume) || 0) + delta) * 100) / 100));
    player.volume = next;
    if (delta > 0 && player.muted) player.muted = false;
    showVolume();
  };

  context.toggleMute = () => {
    player.muted = !player.muted;
    showVolume();
  };

  const run = id => {
    switch (id) {
      case 'toggle-play': context.togglePlay(); return true;
      case 'seek-back': context.seekStep(-10); return true;
      case 'seek-forward': context.seekStep(10); return true;
      case 'volume-up': context.adjustVolume(VOLUME_STEP); return true;
      case 'volume-down': context.adjustVolume(-VOLUME_STEP); return true;
      case 'mute': context.toggleMute(); return true;
      case 'fullscreen': context.toggleFullscreen?.(); return true;
      case 'subtitles': (context.toggleSubtitles || context.subtitleMenu?.toggle)?.(); return true;
      case 'help': context.toggleHelp?.(); return true;
      default: return false;
    }
  };


  listen(document, 'keydown', event => {
    if (event.defaultPrevented || context.destroyed) return;
    if (context.settingsOpen || context.helpOpen || isTypingTarget(event.target)) return;
    const id = shortcutForKey(event);
    if (!id) return;
    const entry = KEYBOARD_SHORTCUTS.find(shortcut => shortcut.id === id);
    if (entry?.transport && !mayControl()) return;
    event.preventDefault();
    if (id === 'jump') {
      const duration = Number(player.duration);
      if (Number.isFinite(duration) && duration > 0) seekTo(player, (duration * Number(event.key)) / 10, { endEpsilon: 0.25 });
      ui.resetIdle();
      return;
    }
    run(id);
    if (id !== 'help') ui.resetIdle();
  });

  // Mouse wheel only where it means something: on the speaker it sets the
  // volume, on the timeline it seeks. Over the picture it scrolls nothing.
  const volumeArea = root.querySelector('.vanta-player-volume');
  if (volumeArea) {
    listen(volumeArea, 'wheel', event => {
      event.preventDefault();
      wheelVolume += event.deltaY;
      if (Math.abs(wheelVolume) < WHEEL_STEP_THRESHOLD && Math.abs(event.deltaY) < WHEEL_STEP_THRESHOLD) return;
      context.adjustVolume(wheelVolume > 0 ? -VOLUME_STEP : VOLUME_STEP);
      wheelVolume = 0;
    }, { passive: false });
  }

  const timeline = root.querySelector('.vanta-player-timeline-row');
  if (timeline) {
    listen(timeline, 'wheel', event => {
      if (!mayControl() || Math.abs(event.deltaY) < 4) return;
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheelSeekAt < WHEEL_SEEK_DEBOUNCE_MS) return;
      lastWheelSeekAt = now;
      context.seekStep(event.deltaY > 0 ? 10 : -10);
    }, { passive: false });
  }

  context.disposers.push(() => window.clearTimeout(volumeTimer));
  return context;
}

// Click and double click on the picture with a mouse: a click toggles
// playback after a short wait, a double click goes fullscreen instead.
export const CLICK_DELAY_MS = 220;

export function createClickRecognizer({ onClick, onDoubleClick, setTimer = (fn, ms) => window.setTimeout(fn, ms), clearTimer = id => window.clearTimeout(id) }) {
  let timer = null;
  return {
    click() {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
        onDoubleClick();
        return 'double';
      }
      timer = setTimer(() => {
        timer = null;
        onClick();
      }, CLICK_DELAY_MS);
      return 'pending';
    },
    destroy() {
      if (timer !== null) clearTimer(timer);
    }
  };
}
