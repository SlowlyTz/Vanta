import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchPartyApi } from '../../../../src/public/js/api/watch-party.api.js';
import { MediaApi } from '../../../../src/public/js/api/media.api.js';
import { authStore } from '../../../../src/public/js/store/auth.store.js';
import WatchPartyPage from '../../../../src/public/js/pages/watch-party.page.js';
import { makeParty, flush, timelineMessage, createFakeController } from './helpers.js';

vi.mock('../../../../src/public/js/api/watch-party.api.js', () => ({
  WatchPartyApi: {
    join: vi.fn(),
    setReady: vi.fn(),
    kick: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    end: vi.fn(),
    resolveInviteUser: vi.fn(),
    sendInvitation: vi.fn()
  }
}));

vi.mock('../../../../src/public/js/api/media.api.js', () => ({
  MediaApi: {
    getItem: vi.fn(),
    getImageUrl: vi.fn().mockReturnValue('poster.jpg'),
    getPlayback: vi.fn(),
    reportPlayback: vi.fn(),
    getSeasons: vi.fn().mockResolvedValue([]),
    getEpisodes: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../../../../src/public/js/store/auth.store.js', () => ({
  authStore: { getState: vi.fn() }
}));

vi.mock('../../../../src/public/js/store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

let capturedOnMessage = null;
const fakeSocket = { sendJson: vi.fn(), close: vi.fn() };

vi.mock('../../../../src/public/js/realtime/watch-party.socket.js', () => ({
  createWatchPartySocket: vi.fn(({ onMessage }) => {
    capturedOnMessage = onMessage;
    return fakeSocket;
  })
}));

const fakeController = createFakeController();

const { mountVantaPlayer } = vi.hoisted(() => ({ mountVantaPlayer: vi.fn() }));

vi.mock('/vendor/player/vanta-player.js', () => ({ mountVantaPlayer }));

const { mountCountdown } = vi.hoisted(() => ({ mountCountdown: vi.fn() }));

vi.mock('/vendor/countdown/vanta-countdown.js', () => ({ mountCountdown }));

mountVantaPlayer.mockResolvedValue(fakeController);

describe('WatchPartyPage · Ready Room', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeController.reset();
    capturedOnMessage = null;
    window.location.hash = '#/watch-party/party-1';
  });

  afterEach(() => {
    document.documentElement.classList.remove('player-active');
    document.body.classList.remove('player-active');
  });

  it('lädt im Ready-Room vor, meldet den Fortschritt und sendet PLAYER_READY erst nach Klick und vollem Puffer', async () => {
    vi.useFakeTimers();
    try {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      WatchPartyApi.join.mockResolvedValue({
        party: makeParty({
          status: 'ready-room',
          members: [
            { userId: 'owner-1', username: 'Alice', role: 'owner', ready: false, connected: true, preloadState: 'idle' },
            { userId: 'viewer-1', username: 'Bob', role: 'viewer', ready: false, connected: true, preloadState: 'idle' }
          ]
        })
      });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });
      let bufferedAhead = 0;
      fakeController.getBufferedAhead.mockImplementation(() => bufferedAhead);

      const container = WatchPartyPage({ partyId: 'party-1' });
      await vi.advanceTimersByTimeAsync(50);

      const lobby = container.querySelector('.watch-party-lobby');
      expect(lobby.hidden).toBe(false);
      expect(lobby.dataset.phase).toBe('ready');
      expect(mountVantaPlayer).toHaveBeenCalledWith(expect.objectContaining({ deferInitialLoad: true }));
      // The source loads as soon as the ready phase opens, before anyone clicks.
      expect(fakeController.prepareInitialPlayback).toHaveBeenCalledWith({ position: 0 });
      expect(fakeSocket.sendJson).toHaveBeenCalledWith({ type: 'PLAYER_READY_STATE', state: 'preparing', progress: 0 });

      bufferedAhead = 2;
      await vi.advanceTimersByTimeAsync(300);
      expect(fakeSocket.sendJson).toHaveBeenCalledWith({ type: 'PLAYER_READY_STATE', state: 'preparing', progress: 0.5 });

      const readyButton = container.querySelector('.watch-party-ready-button');
      readyButton.click();
      expect(fakeController.unlockPlayback).toHaveBeenCalled();
      expect(readyButton.textContent).toBe('Wird geladen … 50 %');
      expect(fakeSocket.sendJson).not.toHaveBeenCalledWith({ type: 'PLAYER_READY' });

      bufferedAhead = 4;
      await vi.advanceTimersByTimeAsync(300);
      expect(fakeSocket.sendJson).toHaveBeenCalledWith({ type: 'PLAYER_READY' });
      expect(readyButton.textContent).toBe('Bereit ✓');
      expect(readyButton.disabled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('meldet "geladen" ohne Klick und sendet PLAYER_READY sofort beim Klick', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'ready-room' }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    expect(fakeSocket.sendJson).toHaveBeenCalledWith({ type: 'PLAYER_READY_STATE', state: 'loaded', progress: 1 });
    container.querySelector('.watch-party-ready-button').click();
    expect(fakeSocket.sendJson).toHaveBeenCalledWith({ type: 'PLAYER_READY' });
  });

  it('bietet nach einem Ladefehler einen neuen Versuch an', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'ready-room' }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });
    fakeController.prepareInitialPlayback.mockRejectedValueOnce(new Error('Stream-Limit erreicht'));

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const readyButton = container.querySelector('.watch-party-ready-button');
    expect(readyButton.textContent).toBe('Erneut versuchen');
    expect(container.querySelector('.watch-party-ready-status').textContent).toBe('Stream-Limit erreicht');
    expect(fakeSocket.sendJson).toHaveBeenCalledWith({ type: 'PLAYER_READY_STATE', state: 'error', message: 'Stream-Limit erreicht' });

    readyButton.click();
    await flush();
    await flush();
    expect(fakeController.prepareInitialPlayback).toHaveBeenCalledTimes(2);
    expect(readyButton.textContent).toBe('Bereit');
  });

  it('startet zur angekündigten Serverzeit selbst, ohne auf eine Server-Nachricht zu warten', async () => {
    vi.useFakeTimers();
    try {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'ready-room' }) });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await vi.advanceTimersByTimeAsync(50);

      const startsAt = Date.now() + 5400;
      capturedOnMessage({
        type: 'COUNTDOWN',
        startsAtServerTimeMs: startsAt,
        durationMs: 5000,
        positionMs: 0,
        timeline: { positionMs: 0, playing: true, anchorServerTimeMs: startsAt, seq: 2 }
      });

      const overlay = container.querySelector('.watch-party-countdown-overlay');
      const digit = container.querySelector('.watch-party-countdown-number');
      expect(overlay.hidden).toBe(false);
      await vi.advanceTimersByTimeAsync(0);
      // Beneath the countdown the lobby has given way to the paused player.
      expect(container.querySelector('.watch-party-lobby').hidden).toBe(true);
      expect(container.querySelector('.watch-party-player-mount').classList.contains('player-page')).toBe(true);
      // The lead-in before the counted seconds still shows a five.
      expect(digit.textContent).toBe('5');

      await vi.advanceTimersByTimeAsync(2500);
      expect(digit.textContent).toBe('3');

      await vi.advanceTimersByTimeAsync(2850);
      expect(overlay.hidden).toBe(false);
      expect(fakeController.syncPlay).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(100);
      expect(overlay.hidden).toBe(true);
      expect(fakeController.syncPlay).toHaveBeenCalledWith({ quiet: true });
      expect(mountVantaPlayer.mock.calls.at(-1)[0].watchParty.phase).toBe('playback');
    } finally {
      vi.useRealTimers();
    }
  });

  it('übernimmt nach einem Reconnect mitten im Countdown die restliche Zeit', async () => {
    vi.useFakeTimers();
    try {
      authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
      const startsAt = Date.now() + 2000;
      WatchPartyApi.join.mockResolvedValue({
        party: makeParty({
          status: 'countdown',
          timeline: { positionMs: 30_000, playing: true, anchorServerTimeMs: startsAt, seq: 5 }
        })
      });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await vi.advanceTimersByTimeAsync(50);

      expect(container.querySelector('.watch-party-countdown-number').textContent).toBe('2');
      await vi.advanceTimersByTimeAsync(2000);
      expect(fakeController.syncPlay).toHaveBeenCalledWith({ quiet: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it('bleibt in der Bereit-Phase in der Lobby und lädt den Player unsichtbar dahinter', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'lobby' }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    expect(mountVantaPlayer).not.toHaveBeenCalled();

    capturedOnMessage({ type: 'PARTY_UPDATED', party: makeParty({ status: 'ready-room' }) });
    await flush();

    expect(mountVantaPlayer).toHaveBeenCalled();
    const call = mountVantaPlayer.mock.calls.at(-1)[0];
    expect(call.deferInitialLoad).toBe(true);
    expect(call.watchParty.phase).toBe('ready-room');

    const lobby = container.querySelector('.watch-party-lobby');
    const playerMount = container.querySelector('.watch-party-player-mount');
    expect(lobby.hidden).toBe(false);
    expect(lobby.dataset.phase).toBe('ready');
    expect(container.querySelector('.watch-party-ready-button').hidden).toBe(false);
    expect(playerMount.classList.contains('is-preloading')).toBe(true);
    expect(playerMount.classList.contains('player-page')).toBe(false);
    expect(playerMount.getAttribute('aria-hidden')).toBe('true');
    expect(document.body.classList.contains('player-active')).toBe(false);
  });

  it('zeigt beim COUNTDOWN das Overlay und legt den Player darunter, ohne play aufzurufen', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'ready-room' }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const lobby = container.querySelector('.watch-party-lobby');
    expect(lobby.hidden).toBe(false);

    const startsAt = Date.now() + 5000;
    capturedOnMessage({ type: 'COUNTDOWN', startsAtServerTimeMs: startsAt, positionMs: 0 });
    await flush();

    expect(lobby.hidden).toBe(true);
    const playerMount = container.querySelector('.watch-party-player-mount');
    expect(playerMount.classList.contains('player-page')).toBe(true);
    expect(document.body.classList.contains('player-active')).toBe(true);
    expect(container.querySelector('.watch-party-countdown-overlay').hidden).toBe(false);
    expect(container.querySelector('.watch-party-countdown-ring')).toBeTruthy();
    expect(container.querySelector('.watch-party-countdown-number').textContent).toBe('5');
    expect(container.querySelector('.watch-party-countdown-title').textContent).toBe('Test Movie');
    expect(container.querySelector('.watch-party-countdown-position').textContent).toBe('Von Anfang an');
    expect(fakeController.syncPlay).not.toHaveBeenCalled();
  });

  it('revealt den Player und versteckt den Countdown erst beim Start der Zeitleiste', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'lobby' }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });
    fakeController.prepareInitialPlayback.mockImplementation(() => {
      expect(container.querySelector('.watch-party-countdown-overlay').hidden).toBe(true);
      expect(container.querySelector('.watch-party-player-mount').classList.contains('player-page')).toBe(true);
      return Promise.resolve();
    });
    fakeController.syncPlay.mockImplementation(async () => {
      const mountOptions = mountVantaPlayer.mock.calls.at(-1)?.[0];
      expect(mountOptions.watchParty.phase).toBe('playback');
      fakeController.player.paused = false;
    });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    capturedOnMessage({ type: 'COUNTDOWN', startsAtServerTimeMs: Date.now() + 5000, positionMs: 0 });
    await flush();
    capturedOnMessage(timelineMessage({ reason: 'start' }));
    await flush();
    await flush();

    const lobby = container.querySelector('.watch-party-lobby');
    const playerMount = container.querySelector('.watch-party-player-mount');
    expect(lobby.hidden).toBe(true);
    expect(playerMount.classList.contains('player-page')).toBe(true);
    expect(playerMount.classList.contains('vanta-player-root')).toBe(true);
    expect(container.querySelector('.watch-party-countdown-overlay').hidden).toBe(true);
    const { position } = fakeController.prepareInitialPlayback.mock.calls.at(-1)[0];
    expect(position).toBeGreaterThanOrEqual(0);
    expect(position).toBeLessThan(0.5);
    expect(fakeController.syncPlay).toHaveBeenCalled();
    expect(fakeController.player.paused).toBe(false);
  });

  it('startet genau einmal: PARTY_UPDATED nach dem Countdown löst keinen zweiten Start aus', async () => {
    vi.useFakeTimers();
    try {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'ready-room' }) });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      WatchPartyPage({ partyId: 'party-1' });
      await vi.advanceTimersByTimeAsync(50);

      const startsAt = Date.now() + 5400;
      const timeline = { positionMs: 0, playing: true, anchorServerTimeMs: startsAt, seq: 3 };
      capturedOnMessage({ type: 'COUNTDOWN', startsAtServerTimeMs: startsAt, durationMs: 5000, positionMs: 0, timeline });
      await vi.advanceTimersByTimeAsync(5500);

      capturedOnMessage({
        type: 'PARTY_UPDATED',
        party: makeParty({ status: 'playing', positionMs: 0, lastServerTimeMs: startsAt, timeline })
      });
      await vi.advanceTimersByTimeAsync(2000);

      expect(mountVantaPlayer).toHaveBeenCalledTimes(1);
      expect(fakeController.syncPlay).toHaveBeenCalledTimes(1);
      expect(fakeController.player.paused).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('übergibt Startzeit, Dauer und Server-Uhr an die 3D-Szene und blendet den Fallback aus', async () => {
    const destroy = vi.fn();
    mountCountdown.mockResolvedValue({ done: Promise.resolve(), destroy });
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'ready-room' }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const startsAt = Date.now() + 5400;
    capturedOnMessage({ type: 'COUNTDOWN', startsAtServerTimeMs: startsAt, durationMs: 5000, positionMs: 0 });
    await flush();
    await flush();

    expect(mountCountdown).toHaveBeenCalledWith(expect.objectContaining({
      container: container.querySelector('.watch-party-countdown-stage'),
      fadeTarget: container.querySelector('.watch-party-countdown-overlay'),
      startsAtServerTimeMs: startsAt,
      durationMs: 5000,
      now: expect.any(Function)
    }));
    expect(Math.abs(mountCountdown.mock.calls[0][0].now() - Date.now())).toBeLessThan(1000);
    const overlay = container.querySelector('.watch-party-countdown-overlay');
    expect(overlay.classList.contains('is-3d')).toBe(true);
    expect(container.querySelector('.watch-party-countdown-live').textContent).toBe('Test Movie startet in 5 Sekunden.');

    capturedOnMessage({ type: 'PARTY_ENDED', party: makeParty({ status: 'ended' }) });
    expect(destroy).toHaveBeenCalled();
    expect(overlay.hidden).toBe(true);
  });
});
