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

describe('WatchPartyPage · Episode Sync', () => {
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

  it('erlaubt Admins (nicht nur Owner) einen editierbaren Episode-Browser', async () => {
    const episodeItem = { Id: 'ep-1', Name: 'Pilot', Type: 'Episode', SeriesId: 'series-1', SeriesName: 'Test Series' };
    MediaApi.getItem.mockResolvedValue(episodeItem);
    MediaApi.getSeasons.mockResolvedValue([{ Id: 'season-1', Name: 'Staffel 1' }]);
    MediaApi.getEpisodes.mockResolvedValue([{ Id: 'ep-1', Name: 'Pilot', ParentIndexNumber: 1, IndexNumber: 1 }]);

    authStore.getState.mockReturnValue({ user: { id: 'admin-1', name: 'Carol' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({
        status: 'playing',
        playableItemId: 'ep-1',
        members: [
          { userId: 'owner-1', username: 'Alice', role: 'owner', ready: true, connected: true },
          { userId: 'admin-1', username: 'Carol', role: 'admin', ready: true, connected: true }
        ]
      })
    });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const adminCall = mountVantaPlayer.mock.calls.at(-1)[0];
    expect(adminCall.episodeBrowser.readonly).toBe(false);
  });

  it('sendet OWNER_CHANGE_EPISODE, wenn ein Admin das Next-Episode-Overlay bestätigt', async () => {
    const episodeItem = { Id: 'ep-1', Name: 'Pilot', Type: 'Episode', SeriesId: 'series-1', SeriesName: 'Test Series' };
    MediaApi.getItem.mockResolvedValue(episodeItem);
    MediaApi.getSeasons.mockResolvedValue([{ Id: 'season-1', Name: 'Staffel 1' }]);
    MediaApi.getEpisodes.mockResolvedValue([
      { Id: 'ep-1', Name: 'Pilot', ParentIndexNumber: 1, IndexNumber: 1 },
      { Id: 'ep-2', Name: 'Folge 2', ParentIndexNumber: 1, IndexNumber: 2 }
    ]);

    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', playableItemId: 'ep-1' })
    });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const ownerCall = mountVantaPlayer.mock.calls.at(-1)[0];
    ownerCall.episodeBrowser.onNextEpisode({ episode: { Id: 'ep-2' } });

    expect(fakeSocket.sendJson).toHaveBeenCalledWith({
      type: 'OWNER_CHANGE_EPISODE',
      itemId: 'ep-2',
      positionMs: 0
    });
  });

  it('ignoriert onNextEpisode für Zuschauer ohne Adminrechte', async () => {
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
    viewerCall.episodeBrowser.onNextEpisode({ episode: { Id: 'ep-2' } });

    expect(fakeSocket.sendJson).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'OWNER_CHANGE_EPISODE' }));
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
});
