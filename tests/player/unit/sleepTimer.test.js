import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bindSleepTimer, createSleepTimerCore, formatCountdown, formatRemaining } from '../../../src/player/src/sleepTimer.js';
import { renderSleepTimerPage } from '../../../src/player/src/settings/pages.js';
import { SLEEP_PRESETS } from '../../../src/player/src/sleepTimer.js';

const MIN = 60 * 1000;

describe('createSleepTimerCore', () => {
  it('counts a set time down only while playing', () => {
    const core = createSleepTimerCore({ getEndMs: () => 0 });
    core.set({ mode: 'duration', remainingMs: 2 * MIN });
    core.tick(true, 30_000);
    core.tick(false, 30_000);
    expect(core.remainingMs()).toBe(90_000);
    expect(core.phase()).toBe('running');
    core.tick(true, 30_000);
    expect(core.phase()).toBe('warning');
    core.tick(true, 60_000);
    expect(core.phase()).toBe('done');
  });

  it('runs "bis zum Ende" on the time left to the end point', () => {
    let left = 5 * MIN;
    const core = createSleepTimerCore({ getEndMs: () => left });
    core.set({ mode: 'end' });
    expect(core.phase()).toBe('running');
    left = 30_000;
    expect(core.phase()).toBe('warning');
    left = -1;
    expect(core.phase()).toBe('done');
  });

  it('starts from a carried state and can be cancelled', () => {
    const core = createSleepTimerCore({ getEndMs: () => 0, initial: { mode: 'duration', remainingMs: 1000 } });
    expect(core.state()).toEqual({ mode: 'duration', remainingMs: 1000 });
    core.cancel();
    expect(core.phase()).toBe('off');
  });
});

describe('formatting', () => {
  it('formats the countdown and the remaining time', () => {
    expect(formatCountdown(59_000)).toBe('0:59');
    expect(formatRemaining(23 * MIN)).toBe('noch 23 Min.');
    expect(formatRemaining(90 * MIN)).toBe('noch 1 Std. 30 Min.');
    expect(formatRemaining(10_000)).toBe('noch 1 Min.');
  });
});

describe('bindSleepTimer', () => {
  let context;

  const setup = (overrides = {}) => {
    document.body.innerHTML = '<div class="vanta-player-root"><div class="vanta-player-shell"></div></div>';
    const disposers = [];
    context = {
      root: document.querySelector('.vanta-player-root'),
      player: Object.assign(new EventTarget(), { paused: false, currentTime: 0, duration: 3000, pause: vi.fn() }),
      disposers,
      segments: [],
      onBack: vi.fn(),
      onSleep: vi.fn(),
      sleepTimerOptions: { onChange: vi.fn() },
      ...overrides
    };
    return bindSleepTimer(context);
  };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    context?.disposers.forEach(fn => fn());
    vi.useRealTimers();
  });

  const notice = () => document.querySelector('.vanta-sleep-notice');

  it('warns one minute before, then closes the player', () => {
    const timer = setup();
    timer.set({ mode: 'duration', remainingMs: 2 * MIN });
    vi.advanceTimersByTime(59_000);
    expect(notice().hidden).toBe(true);
    vi.advanceTimersByTime(1_000);
    expect(notice().hidden).toBe(false);
    expect(notice().textContent).toContain('1:00');
    vi.advanceTimersByTime(60_000);
    expect(context.player.pause).toHaveBeenCalled();
    expect(context.onSleep).toHaveBeenCalledTimes(1);
  });

  it('holds while paused', () => {
    const timer = setup();
    timer.set({ mode: 'duration', remainingMs: MIN });
    context.player.paused = true;
    vi.advanceTimersByTime(5 * MIN);
    expect(context.onSleep).not.toHaveBeenCalled();
  });

  it('keeps playing after "Abbrechen"', () => {
    const timer = setup();
    timer.set({ mode: 'duration', remainingMs: 30_000 });
    vi.advanceTimersByTime(1_000);
    notice().querySelector('.vanta-sleep-notice-cancel').click();
    expect(notice().hidden).toBe(true);
    vi.advanceTimersByTime(MIN);
    expect(context.onSleep).not.toHaveBeenCalled();
    expect(timer.label()).toBe('Aus');
  });

  it('closes at the start of the credits "bis zum Ende" and blocks the next episode', () => {
    const timer = setup({ segments: [{ type: 'outro', startMs: 2_800_000, endMs: 2_950_000 }] });
    timer.set({ mode: 'end' });
    expect(timer.blocksNextEpisode()).toBe(true);
    context.player.currentTime = 2750;
    vi.advanceTimersByTime(1_000);
    expect(notice().hidden).toBe(false);
    context.player.currentTime = 2800;
    vi.advanceTimersByTime(1_000);
    expect(context.onSleep).toHaveBeenCalled();
  });

  it('falls back to the end of the file without credits', () => {
    const timer = setup();
    timer.set({ mode: 'end' });
    context.player.currentTime = 2999;
    vi.advanceTimersByTime(1_000);
    expect(context.onSleep).not.toHaveBeenCalled();
    context.player.currentTime = 3000;
    vi.advanceTimersByTime(1_000);
    expect(context.onSleep).toHaveBeenCalled();
  });

  it('closes "bis zum Ende" also when the file ends early', () => {
    const timer = setup();
    timer.set({ mode: 'end' });
    context.player.currentTime = 2900;
    context.player.dispatchEvent(new Event('ended'));
    expect(context.onSleep).toHaveBeenCalledTimes(1);
  });

  it('ignores the end of the file with a set time', () => {
    const timer = setup();
    timer.set({ mode: 'duration', remainingMs: 30 * MIN });
    context.player.dispatchEvent(new Event('ended'));
    expect(context.onSleep).not.toHaveBeenCalled();
  });

  it('does not take the focus on a TV or over an open menu', () => {
    document.body.innerHTML = '';
    const layer = document.createElement('div');
    layer.className = 'vanta-player-controls-layer';
    const play = document.createElement('button');
    layer.appendChild(play);

    for (const overrides of [{ tvMode: true }, { settingsOpen: true }, {}]) {
      context?.disposers.forEach(fn => fn());
      const timer = setup(overrides);
      document.querySelector('.vanta-player-shell').appendChild(layer);
      play.focus();
      timer.set({ mode: 'duration', remainingMs: 30_000 });
      const cancel = notice().querySelector('.vanta-sleep-notice-cancel');
      expect(notice().hidden).toBe(false);
      expect(document.activeElement === cancel).toBe(Object.keys(overrides).length === 0);
    }
  });

  it('reports its state, so the next episode takes it along', () => {
    setup({ sleepTimerOptions: { initial: { mode: 'duration', remainingMs: 5 * MIN }, onChange: vi.fn() } });
    vi.advanceTimersByTime(1_000);
    expect(context.sleepTimerOptions.onChange).toHaveBeenLastCalledWith({ mode: 'duration', remainingMs: 5 * MIN - 1000 });
  });

  it('is not offered in a watch party', () => {
    expect(setup({ watchParty: { enabled: true } })).toBeNull();
    expect(context.sleepTimer).toBeUndefined();
  });
});

describe('renderSleepTimerPage', () => {
  it('offers the presets with the right end label and a custom time', () => {
    const body = document.createElement('div');
    const onSelect = vi.fn();
    const onCustom = vi.fn();
    const flyout = { back: vi.fn() };
    renderSleepTimerPage(body, { presets: SLEEP_PRESETS, current: 'off', endLabel: 'Bis zum Ende der Folge', customMin: 1, customMax: 480, onSelect, onCustom }, flyout);

    expect([...body.querySelectorAll('.vanta-settings-option-label')].map(el => el.textContent))
      .toEqual(['Aus', '15 Min.', '30 Min.', '1 Std.', '2 Std.', 'Bis zum Ende der Folge']);
    body.querySelector('[data-option-id="30"]').click();
    expect(onSelect).toHaveBeenCalledWith('30');

    body.querySelector('[data-step="5"]').click();
    body.querySelector('.vanta-sleep-custom-start').click();
    expect(onCustom).toHaveBeenCalledWith(50);

    body.querySelector('input').value = '9999';
    body.querySelector('.vanta-sleep-custom-start').click();
    expect(onCustom).toHaveBeenLastCalledWith(480);
  });
});
