import { describe, it, expect, vi, afterEach } from 'vitest';
import { bindShortcuts, createClickRecognizer, shortcutForKey, KEYBOARD_SHORTCUTS, POINTER_SHORTCUTS, CLICK_DELAY_MS } from '../../../src/player/src/player/shortcuts.js';

function setup({ canControl = true, party = false } = {}) {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="vanta-player-volume-bubble"><span class="vanta-player-volume-bubble-value"></span></div>
    <div class="vanta-player-volume"><button class="mute"></button></div>
    <div class="vanta-player-timeline-row"><media-time-slider></media-time-slider></div>`;
  document.body.appendChild(root);
  const player = { currentTime: 100, duration: 1000, volume: 0.5, muted: false, paused: true, playbackRate: 1 };
  const disposers = [];
  const context = {
    root,
    player,
    disposers,
    destroyed: false,
    watchParty: party ? { enabled: true } : null,
    canControlWatchParty: () => canControl,
    ui: { resetIdle: vi.fn() },
    dom: { volumeBubble: root.querySelector('.vanta-player-volume-bubble') },
    togglePlay: vi.fn(),
    seekStep: vi.fn(),
    toggleFullscreen: vi.fn(),
    toggleHelp: vi.fn(),
    subtitleMenu: { toggle: vi.fn() },
    listen: (target, event, handler, options) => {
      target.addEventListener(event, handler, options);
      disposers.push(() => target.removeEventListener(event, handler, options));
    }
  };
  bindShortcuts(context);
  return {
    context,
    root,
    player,
    press: (key, init = {}) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })),
    cleanup: () => {
      disposers.forEach(dispose => dispose());
      root.remove();
    }
  };
}

let env;
afterEach(() => {
  env?.cleanup();
  env = null;
});

describe('shortcutForKey', () => {
  it('kennt alle Tasten aus der Tabelle, auch in Großschreibung', () => {
    const cases = { ' ': 'toggle-play', K: 'toggle-play', ArrowLeft: 'seek-back', j: 'seek-back', l: 'seek-forward', ArrowUp: 'volume-up', ArrowDown: 'volume-down', m: 'mute', F: 'fullscreen', c: 'subtitles', '?': 'help', 7: 'jump' };
    Object.entries(cases).forEach(([key, id]) => expect(shortcutForKey({ key: String(key) })).toBe(id));
    expect(shortcutForKey({ key: 'k', ctrlKey: true })).toBeNull();
    expect(shortcutForKey({ key: 'x' })).toBeNull();
  });

  it('beschreibt jede Tastatur- und Zeiger-Aktion für die Hilfe', () => {
    expect(KEYBOARD_SHORTCUTS.every(entry => entry.keys.length && entry.label)).toBe(true);
    expect(POINTER_SHORTCUTS.map(entry => entry.id)).toEqual(['click', 'dblclick', 'wheel-volume', 'wheel-timeline', 'tap', 'double-tap']);
  });
});

describe('bindShortcuts', () => {
  it('steuert Wiedergabe, Spulen, Vollbild, Untertitel und Hilfe', () => {
    env = setup();
    env.press(' ');
    env.press('ArrowLeft');
    env.press('l');
    env.press('f');
    env.press('c');
    env.press('?');

    expect(env.context.togglePlay).toHaveBeenCalledTimes(1);
    expect(env.context.seekStep).toHaveBeenNthCalledWith(1, -10);
    expect(env.context.seekStep).toHaveBeenNthCalledWith(2, 10);
    expect(env.context.toggleFullscreen).toHaveBeenCalled();
    expect(env.context.subtitleMenu.toggle).toHaveBeenCalled();
    expect(env.context.toggleHelp).toHaveBeenCalled();
  });

  it('regelt die Lautstärke in 5-%-Schritten, hebt Stumm auf und zeigt die Blase', () => {
    env = setup();
    env.player.muted = true;
    env.press('ArrowUp');
    expect(env.player.volume).toBeCloseTo(0.55);
    expect(env.player.muted).toBe(false);
    const bubble = env.root.querySelector('.vanta-player-volume-bubble');
    expect(bubble.classList.contains('is-visible')).toBe(true);
    expect(bubble.textContent).toBe('55 %');

    env.press('m');
    expect(env.player.muted).toBe(true);
    expect(bubble.textContent).toBe('Stumm');
  });

  it('springt mit den Ziffern auf einen Anteil der Laufzeit', () => {
    env = setup();
    env.press('3');
    expect(env.player.currentTime).toBe(300);
  });

  it('lässt Zuschauer in der Party nur Lautstärke, Vollbild, Untertitel und Hilfe bedienen', () => {
    env = setup({ party: true, canControl: false });
    env.press(' ');
    env.press('ArrowRight');
    env.press('5');
    env.press('ArrowDown');
    env.press('f');

    expect(env.context.togglePlay).not.toHaveBeenCalled();
    expect(env.context.seekStep).not.toHaveBeenCalled();
    expect(env.player.currentTime).toBe(100);
    expect(env.player.volume).toBeCloseTo(0.45);
    expect(env.context.toggleFullscreen).toHaveBeenCalled();
  });

  it('schweigt beim Tippen in Feldern und bei offenem Menü oder offener Hilfe', () => {
    env = setup();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    input.remove();
    env.context.settingsOpen = true;
    env.press(' ');
    env.context.settingsOpen = false;
    env.context.helpOpen = true;
    env.press(' ');
    expect(env.context.togglePlay).not.toHaveBeenCalled();
  });

  it('nutzt das Mausrad nur auf dem Lautsprecher (Lautstärke) und der Zeitleiste (Spulen)', () => {
    env = setup();
    const wheel = (target, deltaY) => target.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
    wheel(env.root.querySelector('.vanta-player-volume'), -100);
    expect(env.player.volume).toBeCloseTo(0.55);

    wheel(env.root.querySelector('media-time-slider'), 100);
    expect(env.context.seekStep).toHaveBeenCalledWith(10);

    wheel(env.root, 100);
    expect(env.context.seekStep).toHaveBeenCalledTimes(1);
    expect(env.player.volume).toBeCloseTo(0.55);
  });
});

describe('createClickRecognizer', () => {
  it('pausiert nach kurzer Wartezeit und macht aus einem Doppelklick Vollbild', () => {
    vi.useFakeTimers();
    try {
      const onClick = vi.fn();
      const onDoubleClick = vi.fn();
      const clicks = createClickRecognizer({ onClick, onDoubleClick });

      clicks.click();
      vi.advanceTimersByTime(CLICK_DELAY_MS);
      expect(onClick).toHaveBeenCalledTimes(1);

      clicks.click();
      vi.advanceTimersByTime(100);
      clicks.click();
      vi.advanceTimersByTime(CLICK_DELAY_MS);
      expect(onDoubleClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
