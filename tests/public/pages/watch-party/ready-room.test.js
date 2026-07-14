import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchPartyApi } from '../../../../src/public/js/api/watch-party.api.js';
import { MediaApi } from '../../../../src/public/js/api/media.api.js';
import { authStore } from '../../../../src/public/js/store/auth.store.js';
import WatchPartyPage from '../../../../src/public/js/pages/watch-party.page.js';
import { makeParty, flush } from './helpers.js';

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

const fakeController = {
  player: { currentTime: 0, paused: true, playbackRate: 1 },
  prepareInitialPlayback: vi.fn().mockResolvedValue(undefined),
  applyRemoteControl: vi.fn(),
  updateWatchPartyAccess: vi.fn(),
  destroy: vi.fn()
};

const { mountVantaPlayer } = vi.hoisted(() => ({ mountVantaPlayer: vi.fn() }));

vi.mock('/vendor/player/vanta-player.js', () => ({ mountVantaPlayer }));

mountVantaPlayer.mockResolvedValue(fakeController);

describe('WatchPartyPage · Ready Room', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeController.prepareInitialPlayback.mockResolvedValue(undefined);
    fakeController.applyRemoteControl.mockResolvedValue(undefined);
    fakeController.updateWatchPartyAccess.mockImplementation(() => {});
    fakeController.player.currentTime = 0;
    fakeController.player.paused = true;
    fakeController.player.playbackRate = 1;
    capturedOnMessage = null;
    window.location.hash = '#/watch-party/party-1';
  });

  afterEach(() => {
    document.documentElement.classList.remove('player-active');
    document.body.classList.remove('player-active');
  });

  it('öffnet den Ready-Room und sendet PLAYER_READY ohne Playback-Quelle nach lokalem Bereit-Klick', async () => {
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

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    expect(container.querySelector('.watch-party-ready-overlay').hidden).toBe(false);
    expect(mountVantaPlayer).toHaveBeenCalledWith(expect.objectContaining({ deferInitialLoad: true }));

    container.querySelector('.watch-party-ready-button').click();
    await flush();
    await flush();

    expect(fakeSocket.sendJson).not.toHaveBeenCalledWith(expect.objectContaining({
      type: 'PLAYER_READY_STATE',
      state: 'preparing'
    }));
    expect(fakeController.prepareInitialPlayback).not.toHaveBeenCalled();
    expect(fakeSocket.sendJson).toHaveBeenCalledWith({ type: 'PLAYER_READY' });
  });

  it('versteckt den Countdown-Overlay erst bei CONTROL play, nicht automatisch nach Ablauf der Zeit', async () => {
    vi.useFakeTimers();
    try {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await vi.advanceTimersByTimeAsync(50);

      const startsAt = Date.now() + 5000;
      capturedOnMessage({ type: 'COUNTDOWN', startsAtServerTimeMs: startsAt, positionMs: 0 });

      const overlay = container.querySelector('.watch-party-countdown-overlay');
      expect(overlay.hidden).toBe(false);
      expect(container.querySelector('.watch-party-ready-overlay').hidden).toBe(true);
      expect(container.querySelector('.numero_counting_wrapper')).toBeTruthy();
      expect(container.querySelector('.watch-party-countdown-number').hidden).toBe(true);
      expect(container.querySelector('.watch-party-countdown-number').textContent).toBe('5');

      await vi.advanceTimersByTimeAsync(5800);
      expect(overlay.hidden).toBe(false);
      expect(container.querySelector('.watch-party-countdown-number').textContent).toBe('0');

      capturedOnMessage({ type: 'CONTROL', action: 'play', positionMs: 0, serverTimeMs: Date.now() });
      await vi.advanceTimersByTimeAsync(0);
      expect(overlay.hidden).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('öffnet den Player-Raum bei ready-room ohne Playback-Quelle zu laden', async () => {
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
    expect(lobby.hidden).toBe(true);
    expect(playerMount.classList.contains('player-page')).toBe(true);
    expect(container.querySelector('.watch-party-ready-overlay').hidden).toBe(false);
    expect(document.body.classList.contains('player-active')).toBe(true);
  });

  it('zeigt beim COUNTDOWN das Popup im Ready-Room ohne play aufzurufen', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'ready-room' }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const lobby = container.querySelector('.watch-party-lobby');
    expect(lobby.hidden).toBe(true);

    const startsAt = Date.now() + 5000;
    capturedOnMessage({ type: 'COUNTDOWN', startsAtServerTimeMs: startsAt, positionMs: 0 });

    const playerMount = container.querySelector('.watch-party-player-mount');
    expect(playerMount.classList.contains('player-page')).toBe(true);
    expect(document.body.classList.contains('player-active')).toBe(true);
    expect(container.querySelector('.watch-party-countdown-overlay').hidden).toBe(false);
    expect(container.querySelector('.watch-party-ready-overlay').hidden).toBe(true);
    expect(container.querySelector('.numero_shape')).toBeTruthy();
    expect(container.querySelector('.watch-party-countdown-title').textContent).toBe('Test Movie');
    expect(container.querySelector('.watch-party-countdown-position').textContent).toBe('Von Anfang an');
    expect(fakeController.applyRemoteControl).not.toHaveBeenCalled();
  });

  it('revealt den Player und versteckt den Countdown erst bei CONTROL play', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'lobby' }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });
    fakeController.prepareInitialPlayback.mockImplementation(() => {
      expect(container.querySelector('.watch-party-countdown-overlay').hidden).toBe(true);
      expect(container.querySelector('.watch-party-player-mount').classList.contains('player-page')).toBe(true);
      return Promise.resolve();
    });
    fakeController.applyRemoteControl.mockImplementation(() => {
      const mountOptions = mountVantaPlayer.mock.calls.at(-1)?.[0];
      expect(mountOptions.watchParty.phase).toBe('playback');
      return Promise.resolve();
    });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    capturedOnMessage({ type: 'COUNTDOWN', startsAtServerTimeMs: Date.now() + 5000, positionMs: 0 });
    await flush();
    capturedOnMessage({ type: 'CONTROL', action: 'play', positionMs: 0, serverTimeMs: Date.now() });
    await flush();
    await flush();

    const lobby = container.querySelector('.watch-party-lobby');
    const playerMount = container.querySelector('.watch-party-player-mount');
    expect(lobby.hidden).toBe(true);
    expect(playerMount.classList.contains('player-page')).toBe(true);
    expect(playerMount.classList.contains('vanta-player-root')).toBe(true);
    expect(container.querySelector('.watch-party-countdown-overlay').hidden).toBe(true);
    expect(fakeController.prepareInitialPlayback).toHaveBeenCalledWith({ position: 0 });
    expect(fakeController.applyRemoteControl).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'play', playing: true })
    );
  });

  it('startet den Player als Fallback bei PARTY_UPDATED playing nach dem Countdown', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'ready-room' }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const serverTimeMs = Date.now();
    capturedOnMessage({ type: 'COUNTDOWN', startsAtServerTimeMs: serverTimeMs + 5000, positionMs: 0 });
    await flush();

    capturedOnMessage({
      type: 'PARTY_UPDATED',
      party: makeParty({
        status: 'playing',
        positionMs: 0,
        lastServerTimeMs: serverTimeMs
      })
    });
    await flush();
    await flush();

    expect(container.querySelector('.watch-party-countdown-overlay').hidden).toBe(true);
    expect(fakeController.prepareInitialPlayback).toHaveBeenCalledWith({ position: 0 });
    expect(fakeController.applyRemoteControl).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'play', playing: true, serverTimeMs })
    );
  });
});
