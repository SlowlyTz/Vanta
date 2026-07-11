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
    end: vi.fn()
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

    expect(fakeController.applyRemoteControl).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'play', positionMs: 12000, playing: true })
    );
  });

  it('zeigt keinen manuellen Ready-Button mehr an', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    expect(container.querySelector('.watch-party-ready-button')).toBeNull();
  });

  it('sendet PRELOAD_STATE über den Socket, sobald der Player den onPreloadStateChange-Callback aufruft', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const call = mountVantaPlayer.mock.calls.at(-1)[0];
    call.watchParty.onPreloadStateChange({ state: 'ready', message: 'Bereit' });

    expect(fakeSocket.sendJson).toHaveBeenCalledWith({ type: 'PRELOAD_STATE', state: 'ready', message: 'Bereit' });
  });

  it('zeigt den Countdown-Overlay und startet den Player nach Ablauf', async () => {
    vi.useFakeTimers();
    try {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await vi.advanceTimersByTimeAsync(50);

      const startsAt = Date.now() + 3000;
      capturedOnMessage({ type: 'COUNTDOWN', startsAtServerTimeMs: startsAt, positionMs: 0 });

      const overlay = container.querySelector('.watch-party-countdown-overlay');
      expect(overlay.hidden).toBe(false);

      await vi.advanceTimersByTimeAsync(3800);
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
});
