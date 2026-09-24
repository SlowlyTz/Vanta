import { describe, it, expect, vi } from 'vitest';
import { bindSyncControls, AutoplayBlockedError } from '../../../src/player/src/player/syncControls.js';
import { createEchoTokens } from '../../../src/player/src/syncEcho.js';

function setup({ video = {}, switching = false, autoplayBlocked = false, currentPlayback = { delivery: 'hls' } } = {}) {
  const videoElement = { seeking: false, paused: true, readyState: 4, muted: false, currentTime: 0, buffered: null, ...video };
  const player = new EventTarget();
  Object.assign(player, {
    currentTime: 10,
    paused: true,
    playbackRate: 1,
    duration: 3600,
    querySelector: () => videoElement,
    pause: vi.fn(() => { player.paused = true; })
  });
  const state = { autoplayBlocked };
  const sourceSwitch = {
    isSwitching: () => switching,
    getCurrentPlayback: () => currentPlayback,
    getAutoplayBlocked: () => state.autoplayBlocked,
    setIntendsToPlay: vi.fn(),
    startCurrentPlayback: vi.fn(async () => { player.paused = false; })
  };
  const context = {
    player,
    sourceSwitch,
    echoTokens: createEchoTokens(),
    destroyed: false,
    listen: (target, event, handler) => target.addEventListener(event, handler)
  };
  bindSyncControls(context);
  return { context, player, videoElement, sourceSwitch, state };
}

describe('bindSyncControls', () => {
  it('meldet einen ruhigen, bereiten Player', () => {
    const { context } = setup();
    expect(context.getSyncState()).toMatchObject({ ready: true, currentTime: 10, paused: true, busy: false, rate: 1 });
  });

  it('gilt als beschäftigt beim Quellwechsel, beim Seeken und wenn Daten fehlen', () => {
    expect(setup({ switching: true }).context.getSyncState().busy).toBe(true);
    expect(setup({ video: { seeking: true } }).context.getSyncState().busy).toBe(true);
    expect(setup({ video: { paused: false, readyState: 2 } }).context.getSyncState().busy).toBe(true);
    expect(setup({ video: { paused: true, readyState: 2 } }).context.getSyncState().busy).toBe(false);
  });

  it('ist ohne geladene Quelle nicht bereit', () => {
    expect(setup({ currentPlayback: null }).context.getSyncState().ready).toBe(false);
  });

  it('bucht für jeden eigenen Seek ein Echo-Token und lässt winzige Seeks aus', () => {
    const { context, player } = setup();
    context.syncSeek(10.01);
    expect(context.echoTokens.pendingCount('seek')).toBe(0);

    context.syncSeek(42);
    expect(player.currentTime).toBe(42);
    expect(context.echoTokens.pendingCount('seek')).toBe(1);
  });

  it('startet leise und meldet blockiertes Autoplay als NotAllowedError', async () => {
    const { context, sourceSwitch, state } = setup();
    await context.syncPlay();
    expect(sourceSwitch.startCurrentPlayback).toHaveBeenCalledWith({ quiet: true });
    expect(context.echoTokens.pendingCount('play')).toBe(1);

    const blocked = setup();
    blocked.sourceSwitch.startCurrentPlayback.mockImplementation(async () => { blocked.state.autoplayBlocked = true; });
    await expect(blocked.context.syncPlay()).rejects.toBeInstanceOf(AutoplayBlockedError);
    expect(state.autoplayBlocked).toBe(false);
  });

  it('pausiert nur einen laufenden Player', () => {
    const { context, player } = setup();
    context.syncPause();
    expect(player.pause).not.toHaveBeenCalled();

    player.paused = false;
    context.syncPause();
    expect(player.pause).toHaveBeenCalled();
    expect(context.echoTokens.pendingCount('pause')).toBe(1);
  });

  it('ändert die Rate nur bei echtem Unterschied', () => {
    const { context, player } = setup();
    context.setSyncRate(1.04);
    expect(player.playbackRate).toBe(1.04);
  });

  it('misst den Puffer ab der aktuellen Position', () => {
    const buffered = { length: 2, start: i => [0, 30][i], end: i => [12, 60][i] };
    const { context } = setup({ video: { buffered } });
    expect(context.getBufferedAhead(10)).toBeCloseTo(2);
    expect(context.getBufferedAhead(40)).toBeCloseTo(20);
    expect(context.getBufferedAhead(20)).toBe(0);
  });

  it('schaltet die Wiedergabe in der Nutzergeste frei und stellt Stummschaltung und Position wieder her', async () => {
    const video = { muted: false, currentTime: 5, play: vi.fn(async function play() { this.currentTime = 5.2; }), pause: vi.fn() };
    const { context, videoElement } = setup({ video });
    const unlocked = await context.unlockPlayback();
    expect(unlocked).toBe(true);
    expect(video.play).toHaveBeenCalled();
    expect(videoElement.pause).toHaveBeenCalled();
    expect(videoElement.muted).toBe(false);
    expect(videoElement.currentTime).toBe(5);
  });
});
