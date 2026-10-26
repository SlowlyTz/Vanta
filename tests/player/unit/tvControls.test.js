import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bindTvControls, holdStep, holdTargetLimit } from '../../../src/player/src/player/tvControls.js';

const rect = (element, left, top, width = 40, height = 40) => {
  element.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height });
};

function setup({ state = 'ready-playing-idle', canControl = true, party = false, phase = null } = {}) {
  document.body.innerHTML = `
    <div class="vanta-player-root"><div class="vanta-player-shell">
      <div class="vanta-player-controls-layer">
        <button class="vanta-player-back">back</button>
        <button class="vanta-player-play">play</button>
        <button class="vanta-player-settings-button">gear</button>
      </div>
      <button class="vanta-player-skip-segment" hidden>skip</button>
      <div class="vanta-player-loading"><div class="vanta-player-loading-problem-actions">
        <button class="vanta-player-loading-retry">retry</button>
        <button class="vanta-player-loading-leave">leave</button>
      </div></div>
    </div></div>`;
  const root = document.querySelector('.vanta-player-root');
  rect(root.querySelector('.vanta-player-back'), 0, 0);
  rect(root.querySelector('.vanta-player-play'), 100, 300);
  rect(root.querySelector('.vanta-player-settings-button'), 300, 300);
  rect(root.querySelector('.vanta-player-loading-retry'), 100, 500);
  rect(root.querySelector('.vanta-player-loading-leave'), 300, 500);
  let uiState = state;
  const disposers = [];
  const context = {
    tvMode: true,
    root,
    player: { currentTime: 100, duration: 1000, play: vi.fn(), pause: vi.fn() },
    knownDuration: 1000,
    ui: { getState: () => uiState, setState: s => { uiState = s; }, resetIdle: vi.fn() },
    watchParty: party ? { enabled: true } : null,
    canControlWatchParty: () => canControl,
    isDeferredReadyRoom: () => phase === 'ready-room',
    togglePlay: vi.fn(),
    seekStep: vi.fn(),
    seekToTarget: vi.fn(target => { context.player.currentTime = target; }),
    onBack: vi.fn(),
    disposers,
    listen: (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      disposers.push(() => target.removeEventListener(type, handler, options));
    }
  };
  bindTvControls(context);
  return { context, root, getState: () => uiState, dispose: () => disposers.forEach(fn => fn()) };
}

const key = (k, type = 'keydown') => {
  const event = new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  return event;
};

describe('holdStep', () => {
  it('speeds up with the time a direction is held, not the key repeats', () => {
    expect([0, 999, 1000, 2999, 3000, 10_000].map(holdStep)).toEqual([10, 10, 30, 30, 60, 60]);
  });

  it('stops a second before the end of the file', () => {
    expect(holdTargetLimit(1000)).toBe(999);
    expect(holdTargetLimit(0.5)).toBe(0);
    expect(holdTargetLimit(NaN)).toBe(Infinity);
  });
});

describe('bindTvControls', () => {
  let current;
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    current?.dispose();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('leaves the remote to the lobby while the player waits hidden in the ready room', () => {
    current = setup({ state: 'booting', party: true, phase: 'ready-room' });
    const ready = document.body.appendChild(document.createElement('button'));
    ready.focus();
    for (const k of ['Enter', 'ArrowDown', 'ArrowRight']) {
      const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
      ready.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(current.context.togglePlay).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(ready);
  });

  it('a failed start: OK presses the focused button, the arrows go between the two', () => {
    current = setup({ state: 'booting' });
    const retry = current.root.querySelector('.vanta-player-loading-retry');
    const leave = current.root.querySelector('.vanta-player-loading-leave');
    retry.focus();
    const press = (k) => {
      const event = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
      document.activeElement.dispatchEvent(event);
      return event;
    };
    expect(press('Enter').defaultPrevented).toBe(false);
    expect(current.context.togglePlay).not.toHaveBeenCalled();
    press('ArrowRight');
    expect(document.activeElement).toBe(leave);
    press('ArrowLeft');
    expect(document.activeElement).toBe(retry);
  });

  it('does nothing outside TV mode', () => {
    expect(bindTvControls({ tvMode: false })).toBeNull();
  });

  it('plays and pauses with OK while the controls are hidden', () => {
    current = setup();
    const event = key('Enter');
    expect(current.context.togglePlay).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('spools while left/right is held and jumps when let go', () => {
    current = setup();
    let now = 0;
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
    // A slow remote: one repeat every 250 ms.
    for (let i = 0; i < 6; i++) {
      key('ArrowRight');
      now += 250;
    }
    const preview = document.querySelector('.vanta-tv-seek-preview');
    expect(preview.hidden).toBe(false);
    // 4 × 10 s within the first second, then 2 × 30 s
    expect(preview.textContent).toContain('3:20');
    expect(current.context.player.currentTime).toBe(100);
    key('ArrowRight', 'keyup');
    expect(current.context.player.currentTime).toBe(200);
    expect(preview.hidden).toBe(true);
    clock.mockRestore();
  });

  it('spools no further than a second before the end', () => {
    current = setup();
    current.context.player.currentTime = 990;
    key('ArrowRight');
    key('ArrowRight', 'keyup');
    expect(current.context.player.currentTime).toBe(999);
  });

  it('leaves the focus where it is when a prompt appears and reaches it with up/down', () => {
    current = setup();
    const skip = current.root.querySelector('.vanta-player-skip-segment');
    rect(skip, 400, 200);
    skip.hidden = false;
    expect(document.activeElement).not.toBe(skip);
    key('ArrowDown');
    expect(document.activeElement).toBe(skip);
  });

  it('shows the controls with up/down and moves between them', () => {
    current = setup();
    key('ArrowUp');
    expect(current.getState()).toBe('ready-playing-active');
    expect(document.activeElement.className).toBe('vanta-player-play');
    key('ArrowRight');
    expect(document.activeElement.className).toBe('vanta-player-settings-button');
    key('ArrowUp');
    expect(document.activeElement.className).toBe('vanta-player-back');
  });

  it('spools from the big play button while the controls are up (paused)', () => {
    current = setup({ state: 'ready-paused' });
    const center = document.createElement('div');
    center.className = 'vanta-player-center-controls';
    const play = document.querySelector('.vanta-player-play');
    play.replaceWith(center);
    center.appendChild(play);
    play.focus();
    key('ArrowRight');
    expect(document.querySelector('.vanta-tv-seek-preview').hidden).toBe(false);
    expect(document.activeElement).toBe(play);
  });

  it('knows the media keys', () => {
    current = setup({ state: 'ready-playing-active' });
    key('MediaPlayPause');
    key('MediaFastForward');
    key('MediaStop');
    expect(current.context.togglePlay).toHaveBeenCalled();
    expect(current.context.seekStep).toHaveBeenCalledWith(30);
    expect(current.context.onBack).toHaveBeenCalled();
  });

  it('leaves Back to the app and closes an open menu first', () => {
    current = setup();
    expect(key('Escape').defaultPrevented).toBe(false);
    current.context.settingsOpen = true;
    current.context.settings = { close: vi.fn() };
    const event = new KeyboardEvent('keydown', { key: 'Unidentified', keyCode: 461, bubbles: true, cancelable: true });
    Object.defineProperty(event, 'keyCode', { value: 461 });
    document.dispatchEvent(event);
    expect(current.context.settings.close).toHaveBeenCalled();
  });

  it('gives watch-party viewers only the controls', () => {
    current = setup({ party: true, canControl: false });
    key('Enter');
    key('ArrowRight');
    expect(current.context.togglePlay).not.toHaveBeenCalled();
    expect(document.querySelector('.vanta-tv-seek-preview').hidden).toBe(true);
    expect(current.getState()).toBe('ready-playing-active');
  });
});

describe('bindTvControls with the controls shown', () => {
  it('plays and pauses with OK while no control has the focus', () => {
    vi.useFakeTimers();
    const current = setup({ state: 'ready-paused' });
    document.body.focus();
    key('Enter');
    expect(current.context.togglePlay).toHaveBeenCalled();
    current.dispose();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });
});
