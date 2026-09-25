import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bindTimelineWatchdog } from '../../../src/player/src/player/timelineWatchdog.js';

const signal = value => {
  const read = () => value;
  read.set = vi.fn(next => { value = next; });
  return read;
};

describe('bindTimelineWatchdog', () => {
  let video;
  let player;
  let context;
  let tick;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    video = { paused: false, seeking: false, ended: false, currentTime: 12, readyState: 4 };
    player = {
      querySelector: () => video,
      $store: { currentTime: signal(4), paused: signal(false), playing: signal(true), canPlay: signal(true) }
    };
    context = { player, disposers: [] };
    bindTimelineWatchdog(context, { setTimer: fn => { tick = fn; return 1; }, clearTimer: vi.fn() });
  });

  afterEach(() => vi.restoreAllMocks());

  it('hands a stalled store the time of the playing video and says so once', () => {
    tick();
    expect(player.$store.currentTime.set).toHaveBeenCalledWith(12);
    expect(console.warn).toHaveBeenCalledTimes(1);

    video.currentTime = 20;
    tick();
    expect(player.$store.currentTime()).toBe(20);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('leaves the store alone while it keeps up, and while the video pauses or seeks', () => {
    video.currentTime = 4.8;
    tick();
    video.currentTime = 30;
    video.paused = true;
    tick();
    video.paused = false;
    video.seeking = true;
    tick();
    expect(player.$store.currentTime.set).not.toHaveBeenCalled();
  });

  it('stops checking when the player is destroyed', () => {
    const clearTimer = vi.fn();
    const ctx = { player, disposers: [] };
    bindTimelineWatchdog(ctx, { setTimer: () => 7, clearTimer });
    ctx.disposers.forEach(dispose => dispose());
    expect(clearTimer).toHaveBeenCalledWith(7);
  });
});
