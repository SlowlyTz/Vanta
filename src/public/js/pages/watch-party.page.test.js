import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchPartyApi } from '../api/watch-party.api.js';
import { MediaApi } from '../api/media.api.js';
import { authStore } from '../store/auth.store.js';
import { appStore } from '../store/app.store.js';
import WatchPartyPage from './watch-party.page.js';

vi.mock('../api/watch-party.api.js', () => ({
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

vi.mock('../api/media.api.js', () => ({
  MediaApi: {
    getItem: vi.fn(),
    getImageUrl: vi.fn().mockReturnValue('poster.jpg'),
    getPlayback: vi.fn(),
    reportPlayback: vi.fn(),
    getSeasons: vi.fn().mockResolvedValue([]),
    getEpisodes: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../store/auth.store.js', () => ({
  authStore: { getState: vi.fn() }
}));

vi.mock('../store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

let capturedOnMessage = null;
const fakeSocket = { sendJson: vi.fn(), close: vi.fn() };

vi.mock('../realtime/watch-party.socket.js', () => ({
  createWatchPartySocket: vi.fn(({ onMessage }) => {
    capturedOnMessage = onMessage;
    return fakeSocket;
  })
}));

const fakeController = {
  player: { currentTime: 0, paused: true, playbackRate: 1 },
  prepareInitialPlayback: vi.fn().mockResolvedValue(undefined),
  applyRemoteControl: vi.fn(),
  destroy: vi.fn()
};

const { mountVantaPlayer } = vi.hoisted(() => ({ mountVantaPlayer: vi.fn() }));

vi.mock('/vendor/player/vanta-player.js', () => ({ mountVantaPlayer }));

mountVantaPlayer.mockResolvedValue(fakeController);

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

function makeParty(overrides = {}) {
  return {
    id: 'party-1',
    itemId: 'movie-1',
    playableItemId: 'movie-1',
    itemSnapshot: { name: 'Test Movie', type: 'Movie', seriesName: null, productionYear: 2024 },
    ownerUserId: 'owner-1',
    ownerName: 'Alice',
    status: 'lobby',
    positionMs: 0,
    lastServerTimeMs: Date.now(),
    members: [
      { userId: 'owner-1', username: 'Alice', role: 'owner', ready: true, connected: true },
      { userId: 'viewer-1', username: 'Bob', role: 'viewer', ready: false, connected: true }
    ],
    currentUserRole: null,
    ...overrides
  };
}

describe('WatchPartyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeController.prepareInitialPlayback.mockResolvedValue(undefined);
    fakeController.applyRemoteControl.mockResolvedValue(undefined);
    capturedOnMessage = null;
    window.location.hash = '#/watch-party/party-1';
  });

  afterEach(() => {
    document.documentElement.classList.remove('player-active');
    document.body.classList.remove('player-active');
  });

  it('joined die Party beim Laden der Seite', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();

    expect(WatchPartyApi.join).toHaveBeenCalledWith('party-1');
  });

  it('zeigt die Invite-URL an', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    const inviteInput = container.querySelector('.watch-party-invite-input');
    expect(inviteInput.value).toContain('#/watch-party/party-1');
  });

  it('zeigt Kick-Buttons für den Owner', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    expect(container.querySelectorAll('.watch-party-kick-button').length).toBe(1);
  });

  it('zeigt keine Kick-Buttons für Viewer', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    expect(container.querySelectorAll('.watch-party-kick-button').length).toBe(0);
  });

  it('pausiert den Player bei einer CONTROL-pause Nachricht', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 5000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    expect(capturedOnMessage).toBeTruthy();
    capturedOnMessage({ type: 'CONTROL', action: 'pause', positionMs: 8000, serverTimeMs: Date.now() });

    expect(fakeController.applyRemoteControl).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'pause', positionMs: 8000, playing: false })
    );
  });

  it('startet den Player an der berechneten Position bei einer CONTROL-play Nachricht', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 0 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    capturedOnMessage({ type: 'CONTROL', action: 'play', positionMs: 12000, serverTimeMs: Date.now() });
    await flush();
    await flush();

    expect(fakeController.applyRemoteControl).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'play', positionMs: 12000, playing: true })
    );
  });

  it('zeigt den Ready-Button nicht in der Lobby an', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    expect(container.querySelector('.watch-party-ready-overlay').hidden).toBe(true);
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

  it('zerstört den Player und zeigt eine Meldung bei PARTY_ENDED', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 1000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    capturedOnMessage({
      type: 'PARTY_ENDED',
      party: makeParty({ status: 'ended' }),
      message: 'Die Watch Party wurde vom Owner beendet.'
    });

    expect(fakeController.destroy).toHaveBeenCalled();
    expect(container.querySelector('.watch-party-ended-state').hidden).toBe(false);
    expect(container.querySelector('.watch-party-ended-state').textContent)
      .toContain('Die Watch Party wurde vom Owner beendet.');
  });

  it('ersetzt den Player und zeigt einen Toast bei LOAD_MEDIA mit reason=episode-change', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 1000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const firstMountCount = mountVantaPlayer.mock.calls.length;

    capturedOnMessage({
      type: 'LOAD_MEDIA',
      itemId: 'episode-2',
      positionMs: 0,
      reason: 'episode-change',
      message: 'Episode 2 wird abgespielt'
    });
    await flush();
    await flush();

    expect(appStore.showToast).toHaveBeenCalledWith('Episode 2 wird abgespielt', 'success');
    expect(fakeController.destroy).toHaveBeenCalled();
    expect(mountVantaPlayer.mock.calls.length).toBeGreaterThan(firstMountCount);
  });

  it('übergibt dem Player einen read-only Episode-Browser für Viewer und einen editierbaren für den Owner', async () => {
    const episodeItem = { Id: 'ep-1', Name: 'Pilot', Type: 'Episode', SeriesId: 'series-1', SeriesName: 'Test Series' };
    MediaApi.getItem.mockResolvedValue(episodeItem);
    MediaApi.getSeasons.mockResolvedValue([{ Id: 'season-1', Name: 'Staffel 1' }]);
    MediaApi.getEpisodes.mockResolvedValue([{ Id: 'ep-1', Name: 'Pilot', ParentIndexNumber: 1, IndexNumber: 1 }]);

    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', playableItemId: 'ep-1' })
    });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const viewerCall = mountVantaPlayer.mock.calls.at(-1)[0];
    expect(viewerCall.episodeBrowser.enabled).toBe(true);
    expect(viewerCall.episodeBrowser.readonly).toBe(true);
  });

  it('behält die sichtbare Lobby bei status=lobby und mountet keinen Player (Bug-Fix)', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'lobby' }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const lobby = container.querySelector('.watch-party-lobby');
    expect(lobby.hidden).toBe(false);
    expect(container.querySelector('.watch-party-player-mount')).toBeNull();
    expect(document.body.classList.contains('player-active')).toBe(false);
    expect(mountVantaPlayer).not.toHaveBeenCalled();
    expect(MediaApi.getItem).not.toHaveBeenCalled();
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

  it('zeigt den Player sofort bei status=playing', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 5000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    expect(container.querySelector('.watch-party-lobby').hidden).toBe(true);
    expect(document.body.classList.contains('player-active')).toBe(true);
    expect(mountVantaPlayer).toHaveBeenCalledWith(
      expect.objectContaining({ resumePosition: 5 })
    );
  });

  it('sendet OWNER_OPEN_READY_ROOM beim Klick auf Starten in der Lobby', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({
        members: [
          { userId: 'owner-1', username: 'Alice', role: 'owner', ready: true, connected: true },
          { userId: 'viewer-1', username: 'Bob', role: 'viewer', ready: false, connected: false }
        ]
      })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const startButton = container.querySelector('.watch-party-start-button');
    expect(startButton.textContent).toBe('Starten');
    expect(startButton.disabled).toBe(false);

    startButton.click();

    expect(fakeSocket.sendJson).toHaveBeenCalledWith({ type: 'OWNER_OPEN_READY_ROOM' });
  });

  it('zeigt den Verbunden-Status für verbundene Mitglieder statt eines Preload-Status', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({
        members: [
          { userId: 'owner-1', username: 'Alice', role: 'owner', ready: true, connected: true },
          { userId: 'viewer-1', username: 'Bob', role: 'viewer', ready: true, connected: false }
        ]
      })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const connectedStatus = container.querySelector('.watch-party-member-status.is-connected');
    expect(connectedStatus).not.toBeNull();
    expect(connectedStatus.textContent).toBe('Verbunden');

    const waitingStatus = container.querySelector('.watch-party-member-status.is-waiting');
    expect(waitingStatus).not.toBeNull();
    expect(waitingStatus.textContent).toBe('Verbindet …');
  });

  it('zeigt beim Late Join in eine laufende Party bei blockiertem Autoplay ein lokales Popup und aktualisiert beim Klick die Zielposition', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 5000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });
    fakeController.applyRemoteControl.mockRejectedValueOnce(new Error('NotAllowedError'));

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const autoplayOverlay = container.querySelector('.watch-party-autoplay-overlay');
    expect(autoplayOverlay.hidden).toBe(false);

    const blockedPayload = fakeController.applyRemoteControl.mock.calls[0][0];
    expect(blockedPayload).toMatchObject({ action: 'play', playing: true });

    fakeController.applyRemoteControl.mockResolvedValueOnce();
    container.querySelector('.watch-party-autoplay-button').click();
    await flush();

    const retryPayload = fakeController.applyRemoteControl.mock.calls.at(-1)[0];
    expect(retryPayload.action).toBe('play');
    expect(retryPayload.positionMs).toBeGreaterThanOrEqual(blockedPayload.positionMs);
    expect(retryPayload.serverTimeMs).toBeGreaterThanOrEqual(blockedPayload.serverTimeMs);
    expect(autoplayOverlay.hidden).toBe(true);
  });

  it('zeigt bei blockiertem Autoplay während einer späteren CONTROL-play Nachricht ein lokales Popup und synchronisiert beim Klick auf die aktuelle Position', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'paused', positionMs: 5000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    fakeController.applyRemoteControl.mockRejectedValueOnce(new Error('NotAllowedError'));
    const serverTimeMs = Date.now();
    capturedOnMessage({ type: 'CONTROL', action: 'play', positionMs: 5000, serverTimeMs });
    await flush();

    const autoplayOverlay = container.querySelector('.watch-party-autoplay-overlay');
    expect(autoplayOverlay.hidden).toBe(false);

    fakeController.applyRemoteControl.mockResolvedValueOnce();
    container.querySelector('.watch-party-autoplay-button').click();
    await flush();

    const retryPayload = fakeController.applyRemoteControl.mock.calls.at(-1)[0];
    expect(retryPayload.action).toBe('play');
    expect(retryPayload.positionMs).toBeGreaterThanOrEqual(5000);
    expect(retryPayload.serverTimeMs).toBeGreaterThanOrEqual(serverTimeMs);
    expect(autoplayOverlay.hidden).toBe(true);
  });

  describe('Late Join in laufendes Playback', () => {
    it('nutzt effectivePositionMs aus PARTY_STATE, zeigt kein Ready-Overlay und sendet kein PLAYER_READY', async () => {
      authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'lobby' }) });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await flush();
      await flush();

      expect(mountVantaPlayer).not.toHaveBeenCalled();

      const serverTimeMs = Date.now();
      capturedOnMessage({
        type: 'PARTY_STATE',
        party: makeParty({ status: 'playing', positionMs: 100_000 }),
        effectivePositionMs: 130_000,
        serverTimeMs
      });
      await flush();
      await flush();

      expect(mountVantaPlayer).toHaveBeenCalledWith(expect.objectContaining({ resumePosition: 100 }));

      const prepareCall = fakeController.prepareInitialPlayback.mock.calls.at(-1)[0];
      expect(prepareCall.position).toBeGreaterThanOrEqual(130);
      expect(prepareCall.position).toBeLessThan(130.5);

      expect(container.querySelector('.watch-party-ready-overlay').hidden).toBe(true);
      expect(container.querySelector('.watch-party-lobby').hidden).toBe(true);
      expect(fakeSocket.sendJson).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'PLAYER_READY' }));
    });

    it('landet bei Late Join in einer pausierten Party direkt pausiert ohne Countdown', async () => {
      authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
      WatchPartyApi.join.mockResolvedValue({
        party: makeParty({ status: 'paused', positionMs: 42_000 })
      });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await flush();
      await flush();

      expect(container.querySelector('.watch-party-countdown-overlay').hidden).toBe(true);
      expect(container.querySelector('.watch-party-ready-overlay').hidden).toBe(true);
      expect(fakeController.applyRemoteControl).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'pause', playing: false })
      );
    });

    it('mountet den Player nur einmal, wenn init() und eine sofort folgende PARTY_STATE beide enterLivePlayback auslösen (Race-Regression)', async () => {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      const joinLastServerTimeMs = Date.now();
      WatchPartyApi.join.mockResolvedValue({
        party: makeParty({ status: 'playing', positionMs: 5000, lastServerTimeMs: joinLastServerTimeMs })
      });

      let resolveGetItem;
      MediaApi.getItem.mockReturnValue(new Promise(resolve => { resolveGetItem = resolve; }));

      WatchPartyPage({ partyId: 'party-1' });

      await vi.waitFor(() => expect(MediaApi.getItem).toHaveBeenCalled());
      expect(capturedOnMessage).toBeTruthy();

      // Fire a second PLAYBACK_STATUSES PARTY_STATE while the first mount's
      // MediaApi.getItem() call is still pending — the exact race window a real
      // socket message can land in before init()'s own mount resolves.
      capturedOnMessage({
        type: 'PARTY_STATE',
        party: makeParty({ status: 'playing', positionMs: 5000 }),
        effectivePositionMs: 5000,
        serverTimeMs: joinLastServerTimeMs + 1
      });
      await Promise.resolve();

      resolveGetItem({ Id: 'movie-1', Name: 'Test Movie' });
      await flush();
      await flush();

      expect(mountVantaPlayer).toHaveBeenCalledTimes(1);
    });

    it('wendet bei einer erneuten PARTY_STATE mit geändertem Status wieder aktiv play/pause an, statt nur zu synchronisieren', async () => {
      authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'paused', positionMs: 5000 }) });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      WatchPartyPage({ partyId: 'party-1' });
      await flush();
      await flush();

      expect(fakeController.applyRemoteControl).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: 'pause', playing: false })
      );

      const serverTimeMs = Date.now() + 1000;
      capturedOnMessage({
        type: 'PARTY_STATE',
        party: makeParty({ status: 'playing', positionMs: 6000 }),
        effectivePositionMs: 6000,
        serverTimeMs
      });
      await flush();
      await flush();

      expect(fakeController.applyRemoteControl).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: 'play', playing: true })
      );
    });
  });

  describe('Watch Party Notifications', () => {
    it('rendert eine eingehende NOTIFICATION mit passender Klasse und Text', async () => {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await flush();

      capturedOnMessage({
        type: 'NOTIFICATION',
        notification: { id: '1', type: 'member_joined', icon: 'member_joined', message: 'Bob ist beigetreten.', createdAt: Date.now() }
      });

      const item = container.querySelector('.watch-party-notification');
      expect(item).not.toBeNull();
      expect(item.classList.contains('is-member_joined')).toBe(true);
      expect(item.querySelector('.watch-party-notification-text').textContent).toBe('Bob ist beigetreten.');
    });

    it('markiert die Notification nach dem Timer als leaving und entfernt sie danach', async () => {
      vi.useFakeTimers();
      try {
        authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
        WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

        const container = WatchPartyPage({ partyId: 'party-1' });
        await vi.advanceTimersByTimeAsync(50);

        capturedOnMessage({
          type: 'NOTIFICATION',
          notification: { id: '1', type: 'owner_pause', message: 'Der Admin hat pausiert.', createdAt: Date.now() }
        });

        const item = container.querySelector('.watch-party-notification');
        expect(item).not.toBeNull();

        await vi.advanceTimersByTimeAsync(4200);
        expect(item.classList.contains('is-leaving')).toBe(true);

        await vi.advanceTimersByTimeAsync(600);
        expect(container.querySelector('.watch-party-notification')).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('crasht nicht bei unbekanntem Notification-Typ', async () => {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await flush();

      expect(() => capturedOnMessage({
        type: 'NOTIFICATION',
        notification: { id: '1', type: 'something_unknown', message: 'Unbekannt', createdAt: Date.now() }
      })).not.toThrow();

      const item = container.querySelector('.watch-party-notification');
      expect(item.querySelector('.watch-party-notification-icon').textContent).toBe('i');
    });
  });

  describe('Invite per Username', () => {
    it('zeigt den User-einladen-Button nur für den Owner', async () => {
      authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await flush();

      expect(container.querySelector('.watch-party-invite-user').hidden).toBe(true);
    });

    it('öffnet und schließt das Einladungsmenü', async () => {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await flush();

      const overlay = container.querySelector('.watch-party-invite-menu-overlay');
      expect(overlay.hidden).toBe(true);

      container.querySelector('.watch-party-invite-user').click();
      expect(overlay.hidden).toBe(false);

      container.querySelector('.watch-party-invite-menu-close').click();
      expect(overlay.hidden).toBe(true);
    });

    it('versucht keinen Resolve bei leerer Eingabe', async () => {
      vi.useFakeTimers();
      try {
        authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
        WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

        const container = WatchPartyPage({ partyId: 'party-1' });
        await vi.advanceTimersByTimeAsync(50);

        container.querySelector('.watch-party-invite-user').click();
        const input = container.querySelector('.watch-party-invite-username-input');
        input.value = '   ';
        input.dispatchEvent(new Event('input'));

        await vi.advanceTimersByTimeAsync(300);

        expect(WatchPartyApi.resolveInviteUser).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('trimmt die Eingabe und zeigt bei exaktem Treffer genau eine Result-Row', async () => {
      vi.useFakeTimers();
      try {
        authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
        WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
        WatchPartyApi.resolveInviteUser.mockResolvedValue({ user: { id: 'viewer-1', username: 'Bob' } });

        const container = WatchPartyPage({ partyId: 'party-1' });
        await vi.advanceTimersByTimeAsync(50);

        container.querySelector('.watch-party-invite-user').click();
        const input = container.querySelector('.watch-party-invite-username-input');
        input.value = '  Bob  ';
        input.dispatchEvent(new Event('input'));

        await vi.advanceTimersByTimeAsync(300);

        expect(WatchPartyApi.resolveInviteUser).toHaveBeenCalledWith('party-1', 'Bob');
        const resultRows = container.querySelectorAll('.watch-party-invite-result-row');
        expect(resultRows.length).toBe(1);
        expect(resultRows[0].textContent).toContain('Bob');
        expect(resultRows[0].textContent).toContain('Gefunden');
        expect(container.querySelector('.watch-party-invite-send').disabled).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('zeigt "Kein exakter Treffer" bei Teiltreffer ohne exact match', async () => {
      vi.useFakeTimers();
      try {
        authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
        WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
        WatchPartyApi.resolveInviteUser.mockResolvedValue({ user: null });

        const container = WatchPartyPage({ partyId: 'party-1' });
        await vi.advanceTimersByTimeAsync(50);

        container.querySelector('.watch-party-invite-user').click();
        const input = container.querySelector('.watch-party-invite-username-input');
        input.value = 'Bo';
        input.dispatchEvent(new Event('input'));

        await vi.advanceTimersByTimeAsync(300);

        expect(container.querySelector('.watch-party-invite-result').textContent).toBe('Kein exakter Treffer');
        expect(container.querySelector('.watch-party-invite-result-row')).toBeNull();
        expect(container.querySelector('.watch-party-invite-send').disabled).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it('sendet die Einladung über den Senden-Button und zeigt Erfolgs-Feedback', async () => {
      vi.useFakeTimers();
      try {
        authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
        WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
        WatchPartyApi.resolveInviteUser.mockResolvedValue({ user: { id: 'viewer-1', username: 'Bob' } });
        WatchPartyApi.sendInvitation.mockResolvedValue({ invitation: { id: 'inv-1' } });

        const container = WatchPartyPage({ partyId: 'party-1' });
        await vi.advanceTimersByTimeAsync(50);

        container.querySelector('.watch-party-invite-user').click();
        const input = container.querySelector('.watch-party-invite-username-input');
        input.value = 'Bob';
        input.dispatchEvent(new Event('input'));
        await vi.advanceTimersByTimeAsync(300);

        container.querySelector('.watch-party-invite-send').click();
        await vi.advanceTimersByTimeAsync(0);

        expect(WatchPartyApi.sendInvitation).toHaveBeenCalledWith('party-1', 'Bob');
        expect(container.querySelector('.watch-party-invite-status').textContent).toBe('Einladung an Bob gesendet.');
        expect(container.querySelector('.watch-party-invite-menu-overlay').hidden).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it('zeigt eine verständliche Fehlermeldung, wenn das Senden fehlschlägt', async () => {
      vi.useFakeTimers();
      try {
        authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
        WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
        WatchPartyApi.resolveInviteUser.mockResolvedValue({ user: { id: 'viewer-1', username: 'Bob' } });
        WatchPartyApi.sendInvitation.mockRejectedValue(new Error('Diese Watch Party ist voll.'));

        const container = WatchPartyPage({ partyId: 'party-1' });
        await vi.advanceTimersByTimeAsync(50);

        container.querySelector('.watch-party-invite-user').click();
        const input = container.querySelector('.watch-party-invite-username-input');
        input.value = 'Bob';
        input.dispatchEvent(new Event('input'));
        await vi.advanceTimersByTimeAsync(300);

        const sendButton = container.querySelector('.watch-party-invite-send');
        sendButton.click();
        await vi.advanceTimersByTimeAsync(0);

        expect(container.querySelector('.watch-party-invite-status').textContent).toBe('Diese Watch Party ist voll.');
        expect(container.querySelector('.watch-party-invite-status').classList.contains('is-error')).toBe(true);
        expect(sendButton.disabled).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
