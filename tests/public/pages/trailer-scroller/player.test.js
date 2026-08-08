import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getYouTubeEmbedUrl,
  YouTubePlayerManager,
  PLAYER_READY_TIMEOUT_MS
} from '../../../../src/public/js/pages/trailer-scroller/player.js';

describe('getYouTubeEmbedUrl', () => {
  it('keeps playback controls inside the native YouTube player', () => {
    const url = new URL(getYouTubeEmbedUrl('video-123', { autoplay: 0, mute: 1 }));

    expect(url.pathname).toBe('/embed/video-123');
    expect(url.searchParams.get('controls')).toBe('1');
    expect(url.searchParams.get('disablekb')).toBe('0');
    expect(url.searchParams.get('fs')).toBe('1');
    expect(url.searchParams.get('autoplay')).toBe('0');
    expect(url.searchParams.get('mute')).toBe('1');
    expect(url.searchParams.get('playsinline')).toBe('1');
  });
});

describe('YouTubePlayerManager', () => {
  const CONTAINER_ID = 'trailer-player-1-0';
  let createdPlayers;

  function mountTarget() {
    const target = document.createElement('div');
    target.id = CONTAINER_ID;
    document.body.appendChild(target);
    return target;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    createdPlayers = [];

    class FakeYTPlayer {
      constructor(iframeId, config) {
        this.iframeId = iframeId;
        this.events = config.events;
        this.destroy = vi.fn();
        this.getIframe = () => document.getElementById(iframeId);
        createdPlayers.push(this);
      }
    }

    vi.stubGlobal('YT', { Player: FakeYTPlayer, PlayerState: { ENDED: 0 } });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('resolves with the player once YouTube reports ready', async () => {
    mountTarget();
    const manager = new YouTubePlayerManager();
    const onReady = vi.fn();

    const promise = manager.createPlayer(CONTAINER_ID, 'video-1', { onReady });
    await vi.advanceTimersByTimeAsync(0);
    createdPlayers[0].events.onReady({});

    await expect(promise).resolves.toBe(createdPlayers[0]);
    expect(onReady).toHaveBeenCalled();
    expect(manager.players.get(CONTAINER_ID)).toBe(createdPlayers[0]);
    expect(manager.pending.has(CONTAINER_ID)).toBe(false);
  });

  it('settles instead of hanging forever when YouTube never reports back', async () => {
    mountTarget();
    const manager = new YouTubePlayerManager();
    const onError = vi.fn();

    const promise = manager.createPlayer(CONTAINER_ID, 'video-1', { onError });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(PLAYER_READY_TIMEOUT_MS);

    await expect(promise).resolves.toBeNull();
    expect(onError).toHaveBeenCalled();
    // Dropping the failed attempt is what lets the next sync run retry this slide.
    expect(manager.pending.has(CONTAINER_ID)).toBe(false);
  });

  it('releases callers waiting on an attempt that gets destroyed', async () => {
    mountTarget();
    const manager = new YouTubePlayerManager();

    const promise = manager.createPlayer(CONTAINER_ID, 'video-1', {});
    await vi.advanceTimersByTimeAsync(0);
    manager.destroy(CONTAINER_ID);

    await expect(promise).resolves.toBeNull();
  });

  it('builds a single iframe when two sync runs race for the same slide', async () => {
    const target = mountTarget();
    const manager = new YouTubePlayerManager();

    const first = manager.createPlayer(CONTAINER_ID, 'video-1', {});
    const second = manager.createPlayer(CONTAINER_ID, 'video-1', {});
    await vi.advanceTimersByTimeAsync(0);

    expect(first).toBe(second);
    expect(createdPlayers).toHaveLength(1);
    expect(target.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('allows a retry after a failed attempt', async () => {
    mountTarget();
    const manager = new YouTubePlayerManager();

    const failed = manager.createPlayer(CONTAINER_ID, 'video-1', {});
    await vi.advanceTimersByTimeAsync(0);
    createdPlayers[0].events.onError({ data: 150 });
    await expect(failed).resolves.toBeNull();

    const retried = manager.createPlayer(CONTAINER_ID, 'video-1', {});
    await vi.advanceTimersByTimeAsync(0);
    createdPlayers[1].events.onReady({});

    await expect(retried).resolves.toBe(createdPlayers[1]);
  });
});
