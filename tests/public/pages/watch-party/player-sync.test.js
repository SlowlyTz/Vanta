import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchPartyApi } from '../../../../src/public/js/api/watch-party.api.js';
import { MediaApi } from '../../../../src/public/js/api/media.api.js';
import { authStore } from '../../../../src/public/js/store/auth.store.js';
import { appStore } from '../../../../src/public/js/store/app.store.js';
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

describe('WatchPartyPage · Player Sync', () => {
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
});
