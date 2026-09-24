import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchPartyApi } from '../../../../src/public/js/api/watch-party.api.js';
import { MediaApi } from '../../../../src/public/js/api/media.api.js';
import { authStore } from '../../../../src/public/js/store/auth.store.js';
import { appStore } from '../../../../src/public/js/store/app.store.js';
import WatchPartyPage from '../../../../src/public/js/pages/watch-party.page.js';
import { makeParty, flush, timelineMessage, createFakeController } from './helpers.js';

vi.mock('../../../../src/public/js/api/watch-party.api.js', () => ({
  WatchPartyApi: {
    join: vi.fn(),
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

mountVantaPlayer.mockResolvedValue(fakeController);

describe('WatchPartyPage · Player Sync', () => {
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

  it('pausiert den Player bei einer pausierten Zeitleiste', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 5000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    expect(capturedOnMessage).toBeTruthy();
    expect(fakeController.player.paused).toBe(false);

    capturedOnMessage(timelineMessage({ positionMs: 8000, playing: false, actorUserId: 'viewer-1' }));
    await flush();

    expect(fakeController.syncPause).toHaveBeenCalled();
    expect(fakeController.player.paused).toBe(true);
    expect(fakeController.player.currentTime).toBe(8);
  });

  it('startet den Player an der berechneten Position bei einer laufenden Zeitleiste', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 0 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    capturedOnMessage(timelineMessage({ positionMs: 12000, playing: true, actorUserId: 'admin-2' }));
    await flush();
    await flush();

    // A jump of twelve seconds is a hard seek, aimed a little ahead of the timeline.
    expect(fakeController.player.currentTime).toBeGreaterThanOrEqual(12);
    expect(fakeController.player.currentTime).toBeLessThan(12.5);
    expect(fakeController.player.paused).toBe(false);
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

  it('lädt bei einem Folgenwechsel ohne Klick vor, meldet sich bereit und startet mit allen gleichzeitig', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 1000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const firstMountCount = mountVantaPlayer.mock.calls.length;
    const switching = makeParty({
      status: 'switching',
      playableItemId: 'episode-2',
      itemSnapshot: { name: 'Episode 2', type: 'Episode' },
      positionMs: 0,
      timeline: { positionMs: 0, playing: false, anchorServerTimeMs: Date.now(), seq: 5 }
    });
    capturedOnMessage({ type: 'LOAD_MEDIA', itemId: 'episode-2', positionMs: 0, reason: 'episode-change' });
    capturedOnMessage({ type: 'PARTY_UPDATED', party: switching });
    for (let i = 0; i < 6; i += 1) await flush();

    expect(appStore.showToast).not.toHaveBeenCalled();
    expect(fakeController.destroy).toHaveBeenCalledTimes(1);
    expect(mountVantaPlayer.mock.calls.length).toBe(firstMountCount + 1);
    expect(mountVantaPlayer.mock.calls.at(-1)[0].itemId).toBe('episode-2');
    expect(fakeController.prepareInitialPlayback).toHaveBeenCalledWith({ position: 0 });
    expect(fakeSocket.sendJson).toHaveBeenCalledWith({ type: 'PLAYER_READY' });

    const pill = container.querySelector('.watch-party-waiting');
    expect(pill.hidden).toBe(false);
    expect(pill.textContent).toContain('Episode 2 wird geladen …');
    expect(pill.textContent).toContain('von 2 bereit');

    fakeController.syncPlay.mockClear();
    capturedOnMessage(timelineMessage({ positionMs: 0, playing: true, seq: 6, reason: 'episode-start', anchorServerTimeMs: Date.now() - 5 }));
    await flush();
    expect(fakeController.syncPlay).toHaveBeenCalledWith({ quiet: true });
  });

  it('schließt das Nächste-Folge-Popup bei allen, wenn ein Admin abbricht', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'playing', positionMs: 1000 }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });
    fakeController.cancelNextEpisode = vi.fn();

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const { watchParty } = mountVantaPlayer.mock.calls.at(-1)[0];
    expect(watchParty.isNextEpisodeCancelled()).toBe(false);
    capturedOnMessage({ type: 'NEXT_EPISODE_CANCELLED', itemId: 'movie-1' });
    expect(fakeController.cancelNextEpisode).toHaveBeenCalled();
    expect(watchParty.isNextEpisodeCancelled()).toBe(true);
    delete fakeController.cancelNextEpisode;
  });

  it('zeigt bei erreichtem Stream-Limit ein Popup und geht zur Startseite', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'playing', positionMs: 1000 }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const { onPlaybackError } = mountVantaPlayer.mock.calls.at(-1)[0];
    onPlaybackError(Object.assign(new Error('Stream-Limit erreicht. Maximal erlaubt: 1'), { status: 429 }));
    expect(appStore.showToast).toHaveBeenCalledWith('Stream-Limit erreicht. Maximal erlaubt: 1', 'error');
    expect(window.location.hash).toBe('#/home');
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

  it('zeigt beim Late Join in eine laufende Party bei blockiertem Autoplay ein Popup und startet beim Klick', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 5000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });
    fakeController.blockNextPlay();

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const autoplayOverlay = container.querySelector('.watch-party-autoplay-overlay');
    expect(autoplayOverlay.hidden).toBe(false);
    expect(fakeController.player.paused).toBe(true);

    container.querySelector('.watch-party-autoplay-button').click();
    await flush();

    expect(fakeController.syncPlay).toHaveBeenLastCalledWith({ quiet: false });
    expect(fakeController.player.paused).toBe(false);
    expect(autoplayOverlay.hidden).toBe(true);
  });

  it('versucht bei blockiertem Autoplay nicht ständig erneut zu starten', async () => {
    vi.useFakeTimers();
    try {
      authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'paused', positionMs: 5000 }) });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await vi.advanceTimersByTimeAsync(50);

      fakeController.blockNextPlay();
      capturedOnMessage(timelineMessage({ positionMs: 5000, playing: true, actorUserId: 'owner-1' }));
      await vi.advanceTimersByTimeAsync(3000);

      expect(container.querySelector('.watch-party-autoplay-overlay').hidden).toBe(false);
      expect(fakeController.syncPlay).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignoriert das Echo des eigenen Befehls und veraltete Zeitleisten', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'paused', positionMs: 5000 }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();
    fakeController.player.currentTime = 9;
    fakeController.player.paused = false;
    fakeController.syncSeek.mockClear();

    capturedOnMessage(timelineMessage({ positionMs: 9000, playing: true, seq: 5, actorUserId: 'owner-1' }));
    capturedOnMessage(timelineMessage({ positionMs: 1000, playing: false, seq: 4, actorUserId: 'admin-2' }));
    await flush();

    expect(fakeController.syncSeek).not.toHaveBeenCalled();
    expect(fakeController.syncPause).not.toHaveBeenCalled();
  });

  it('stempelt eigene Steuerbefehle mit der Serverzeit', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'paused', positionMs: 5000 }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const { watchParty } = mountVantaPlayer.mock.calls.at(-1)[0];
    watchParty.onOwnerSeek(42_000);

    expect(fakeSocket.sendJson).toHaveBeenCalledWith(expect.objectContaining({
      type: 'OWNER_SEEK',
      positionMs: 42_000,
      atServerTimeMs: expect.any(Number)
    }));
  });

  it('sendet Heartbeats nur als Sync-Leader und hört beim Leader-Wechsel auf', async () => {
    vi.useFakeTimers();
    try {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      WatchPartyApi.join.mockResolvedValue({
        party: makeParty({ status: 'playing', positionMs: 5000, syncLeaderUserId: 'owner-1' })
      });
      MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

      WatchPartyPage({ partyId: 'party-1' });
      await vi.advanceTimersByTimeAsync(50);

      const heartbeats = () => fakeSocket.sendJson.mock.calls.filter(([message]) => message.type === 'OWNER_SYNC');
      await vi.advanceTimersByTimeAsync(5000);
      expect(heartbeats()).toHaveLength(1);
      expect(heartbeats()[0][0]).toMatchObject({ buffering: false, stableMs: 0 });

      capturedOnMessage({
        type: 'PARTY_UPDATED',
        party: makeParty({ status: 'playing', positionMs: 5000, syncLeaderUserId: 'admin-2' })
      });
      await vi.advanceTimersByTimeAsync(15_000);
      expect(heartbeats()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('zeigt Sprünge anderer als Blase mit Namen und schickt eigene Sprünge mit Weite', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'playing', positionMs: 5000 }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });
    fakeController.showSeekFeedback = vi.fn();

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    capturedOnMessage({ ...timelineMessage({ positionMs: 15_000, seq: 9, actorUserId: 'owner-1', reason: 'seek' }), step: 10, actorName: 'Alice' });
    expect(fakeController.showSeekFeedback).toHaveBeenCalledWith(10, { by: 'Alice' });

    capturedOnMessage({ ...timelineMessage({ positionMs: 15_000, seq: 10, actorUserId: 'viewer-1', reason: 'seek' }), step: 10, actorName: 'Bob' });
    expect(fakeController.showSeekFeedback).toHaveBeenCalledTimes(1);

    const { watchParty } = mountVantaPlayer.mock.calls.at(-1)[0];
    watchParty.onOwnerSeek(30_000, { step: -10 });
    expect(fakeSocket.sendJson).toHaveBeenCalledWith(expect.objectContaining({ type: 'OWNER_SEEK', positionMs: 30_000, step: -10 }));
    delete fakeController.showSeekFeedback;
  });

  it('meldet den eigenen Player-Zustand und übernimmt den der anderen', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'playing', positionMs: 5000 }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    expect(fakeSocket.sendJson).toHaveBeenCalledWith(expect.objectContaining({ type: 'PLAYER_STATUS', state: expect.any(String) }));

    capturedOnMessage({ type: 'PRESENCE', members: [{ userId: 'owner-1', connected: true, playbackState: 'buffering', driftMs: 0 }] });
    const { watchParty } = mountVantaPlayer.mock.calls.at(-1)[0];
    expect(watchParty.participants.find(member => member.userId === 'owner-1').playbackState).toBe('buffering');
  });

  it('zeigt die Warte-Pille mit Namen und gibt dem Gastgeber den Schalter', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty({ status: 'playing', positionMs: 5000 }) });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const pill = container.querySelector('.watch-party-waiting');
    expect(pill.hidden).toBe(true);

    capturedOnMessage({
      type: 'PARTY_UPDATED',
      party: makeParty({ status: 'paused', positionMs: 5000, waitForBuffering: true, waiting: { since: Date.now(), members: [{ userId: 'viewer-1', username: 'Bob' }] } })
    });
    expect(pill.hidden).toBe(false);
    expect(pill.textContent).toContain('Warte auf Bob …');
    expect(pill.textContent).toContain('Du kannst das im Zahnrad-Menü unter Watch Party abschalten.');

    const { watchParty } = mountVantaPlayer.mock.calls.at(-1)[0];
    expect(watchParty.isHost).toBe(true);
    watchParty.onSetWaitForBuffering(false);
    expect(fakeSocket.sendJson).toHaveBeenCalledWith({ type: 'OWNER_SET_WAIT_FOR_BUFFERING', enabled: false });

    capturedOnMessage({ type: 'PARTY_UPDATED', party: makeParty({ status: 'playing', positionMs: 5000, waiting: null }) });
    expect(pill.hidden).toBe(true);
  });
});
