import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bindTransportControls, createSeekTally, formatSeekBubble } from '../../../src/player/src/player/transportControls.js';
import { createPlayerUi } from '../../../src/player/src/ui/playerUi.js';

function setup({ watchParty = null, canControl = true } = {}) {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="vanta-player-topbar"></div>
    <button class="vanta-player-play is-large" data-state="paused"></button>
    <div class="vanta-player-bottom-controls">
      <button class="vanta-player-seek vanta-player-seek-back" data-seek="-10"></button>
      <button class="vanta-player-play is-small" data-state="paused"></button>
      <button class="vanta-player-seek vanta-player-seek-forward" data-seek="10"></button>
    </div>
    <div class="vanta-player-seek-bubble is-back"></div>
    <div class="vanta-player-seek-bubble is-forward"></div>`;
  document.body.appendChild(root);

  const player = new EventTarget();
  Object.assign(player, {
    currentTime: 100,
    duration: 3600,
    paused: true,
    play: vi.fn(async () => { player.paused = false; player.dispatchEvent(new Event('play')); }),
    pause: vi.fn(() => { player.paused = true; player.dispatchEvent(new Event('pause')); })
  });

  const disposers = [];
  const context = {
    root,
    player,
    watchParty,
    ui: createPlayerUi(root),
    disposers,
    canControlWatchParty: () => canControl,
    listen: (target, event, handler, options) => {
      target.addEventListener(event, handler, options);
      disposers.push(() => target.removeEventListener(event, handler, options));
    },
    dom: {
      playButtons: [...root.querySelectorAll('.vanta-player-play')],
      seekButtons: [...root.querySelectorAll('.vanta-player-seek')],
      seekBubbles: {
        back: root.querySelector('.vanta-player-seek-bubble.is-back'),
        forward: root.querySelector('.vanta-player-seek-bubble.is-forward')
      }
    }
  };
  bindTransportControls(context);
  const cleanup = () => {
    disposers.forEach(dispose => dispose());
    context.ui.destroy();
    root.remove();
  };
  return { context, root, player, cleanup };
}

describe('createSeekTally', () => {
  it('addiert schnelle Klicks und fängt nach einer Pause neu an', () => {
    let now = 0;
    const tally = createSeekTally({ now: () => now });
    expect(tally.add('back', 10)).toBe(10);
    now += 400;
    expect(tally.add('back', 10)).toBe(20);
    now += 400;
    expect(tally.add('back', 10)).toBe(30);
    now += 2000;
    expect(tally.add('back', 10)).toBe(10);
  });

  it('beginnt beim Richtungswechsel von vorn', () => {
    let now = 0;
    const tally = createSeekTally({ now: () => now });
    tally.add('back', 10);
    now += 100;
    expect(tally.add('forward', 10)).toBe(10);
    now += 100;
    expect(tally.add('back', 10)).toBe(10);
  });

  it('beschriftet die Blase mit Vorzeichen', () => {
    expect(formatSeekBubble('back', 20)).toBe('−20 s');
    expect(formatSeekBubble('forward', 10)).toBe('+10 s');
    expect(formatSeekBubble('forward', 10, 'Lena')).toBe('+10 s · Lena');
  });
});

describe('bindTransportControls', () => {
  let env;
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    env?.cleanup();
    vi.useRealTimers();
  });

  it('spult mit den Buttons um 10 s und zeigt die aufaddierte Blase', () => {
    env = setup();
    const back = env.root.querySelector('.vanta-player-seek-back');
    back.click();
    back.click();

    expect(env.player.currentTime).toBe(80);
    const bubble = env.root.querySelector('.vanta-player-seek-bubble.is-back');
    expect(bubble.textContent).toBe('−20 s');
    expect(bubble.classList.contains('is-visible')).toBe(true);
    expect(back.classList.contains('is-pressed')).toBe(true);

    vi.advanceTimersByTime(800);
    expect(bubble.classList.contains('is-visible')).toBe(false);
  });

  it('schaltet Play/Pause um und hält alle Play-Buttons im selben Zustand', async () => {
    env = setup();
    const [large, small] = env.root.querySelectorAll('.vanta-player-play');
    small.click();
    await Promise.resolve();

    expect(env.player.play).toHaveBeenCalled();
    expect(large.dataset.state).toBe('playing');
    expect(small.getAttribute('aria-label')).toBe('Pause');
    expect(env.root.hasAttribute('data-paused')).toBe(false);

    large.click();
    expect(env.player.pause).toHaveBeenCalled();
    expect(small.dataset.state).toBe('paused');
    expect(env.root.hasAttribute('data-paused')).toBe(true);
  });

  it('lässt Zuschauer einer Watch Party weder spulen noch pausieren', () => {
    env = setup({ watchParty: { enabled: true }, canControl: false });
    env.root.querySelector('.vanta-player-seek-forward').click();
    env.root.querySelector('.vanta-player-play').click();

    expect(env.player.currentTime).toBe(100);
    expect(env.player.play).not.toHaveBeenCalled();
  });

  it('hält die Controls sichtbar, solange die Maus darauf liegt', () => {
    env = setup();
    env.context.ui.setState('ready-playing-active');
    const bottom = env.root.querySelector('.vanta-player-bottom-controls');
    bottom.dispatchEvent(Object.assign(new Event('pointerenter'), { pointerType: 'mouse' }));

    vi.advanceTimersByTime(10_000);
    expect(env.context.ui.getState()).toBe('ready-playing-active');

    bottom.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(4_000);
    expect(env.context.ui.getState()).toBe('ready-playing-idle');
  });

  it('sammelt die Sprünge bis zum nächsten seeked, damit die Party die ganze Weite erfährt', () => {
    env = setup();
    const back = env.root.querySelector('.vanta-player-seek-back');
    back.click();
    back.click();
    expect(env.context.takePendingSeekStep()).toBe(-20);
    expect(env.context.takePendingSeekStep()).toBeNull();
  });

  it('zeigt Sprünge anderer mit Namen und dreht die passenden Icons', () => {
    env = setup({ watchParty: { enabled: true }, canControl: false });
    env.context.showSeekFeedback(10, { by: 'Lena' });
    env.context.showSeekFeedback(10, { by: 'Lena' });

    const bubble = env.root.querySelector('.vanta-player-seek-bubble.is-forward');
    expect(bubble.textContent).toBe('+20 s · Lena');
    expect(env.root.querySelector('.vanta-player-seek-forward').classList.contains('is-pressed')).toBe(true);
    expect(env.root.querySelector('.vanta-player-seek-back').classList.contains('is-pressed')).toBe(false);
    // Only a display: the local player did not move.
    expect(env.player.currentTime).toBe(100);
  });
});
