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

describe('WatchPartyPage · Admin-Rollen', () => {
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

  it('watchPartyConfig.canControl ist für den Owner true', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 0 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const call = mountVantaPlayer.mock.calls.at(-1)[0];
    expect(call.watchParty.canControl).toBe(true);
    expect(call.watchParty.isOwner).toBe(true);
    expect(call.watchParty.currentUserId).toBe('owner-1');
  });

  it('watchPartyConfig.canControl ist für einen beförderten Admin true', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({
        status: 'playing',
        positionMs: 0,
        members: [
          { userId: 'owner-1', username: 'Alice', role: 'owner', ready: true, connected: true },
          { userId: 'viewer-1', username: 'Bob', role: 'admin', ready: true, connected: true }
        ]
      })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const call = mountVantaPlayer.mock.calls.at(-1)[0];
    expect(call.watchParty.canControl).toBe(true);
  });

  it('watchPartyConfig.canControl ist für einen Viewer false', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 0 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const call = mountVantaPlayer.mock.calls.at(-1)[0];
    expect(call.watchParty.canControl).toBe(false);
  });

  it('PARTY_UPDATED aktualisiert participants und ruft onParticipantsChange auf der Player-Config', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 0 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const call = mountVantaPlayer.mock.calls.at(-1)[0];
    const onParticipantsChange = vi.fn();
    call.watchParty.onParticipantsChange = onParticipantsChange;

    const updatedMembers = [
      { userId: 'owner-1', username: 'Alice', role: 'owner', ready: true, connected: true },
      { userId: 'viewer-1', username: 'Bob', role: 'admin', ready: true, connected: true }
    ];
    capturedOnMessage({
      type: 'PARTY_UPDATED',
      party: makeParty({ status: 'playing', positionMs: 0, members: updatedMembers })
    });

    expect(call.watchParty.participants).toEqual(updatedMembers);
    expect(fakeController.updateWatchPartyAccess).toHaveBeenCalledWith(expect.objectContaining({
      participants: updatedMembers,
      canControl: true
    }));
    expect(onParticipantsChange).toHaveBeenCalled();
  });

  it('PARTY_UPDATED schaltet einen laufenden Viewer-Player nach Beförderung direkt für Controls frei', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 0 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    const initialCall = mountVantaPlayer.mock.calls.at(-1)[0];
    expect(initialCall.watchParty.canControl).toBe(false);

    const promotedMembers = [
      { userId: 'owner-1', username: 'Alice', role: 'owner', ready: true, connected: true },
      { userId: 'viewer-1', username: 'Bob', role: 'admin', ready: true, connected: true }
    ];
    capturedOnMessage({
      type: 'PARTY_UPDATED',
      party: makeParty({ status: 'playing', positionMs: 0, members: promotedMembers })
    });

    expect(fakeController.updateWatchPartyAccess).toHaveBeenCalledWith({
      isOwner: true,
      canControl: true,
      participants: promotedMembers,
      currentUserId: 'viewer-1'
    });
  });

  it('BANNED_FROM_PARTY zerstört den Player, zeigt einen Toast und navigiert nach Hause', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 1000 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    capturedOnMessage({ type: 'BANNED_FROM_PARTY', message: 'Du wurdest aus dieser Watch Party ausgeschlossen.' });

    expect(fakeController.destroy).toHaveBeenCalled();
    expect(appStore.showToast).toHaveBeenCalledWith('Du wurdest aus dieser Watch Party ausgeschlossen.', 'error');
    expect(window.location.hash).toBe('#/home');
  });

  it('zeigt einen Admin-Badge für beförderte Mitglieder in der Lobby', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({
        members: [
          { userId: 'owner-1', username: 'Alice', role: 'owner', ready: true, connected: true },
          { userId: 'viewer-1', username: 'Bob', role: 'admin', ready: true, connected: true }
        ]
      })
    });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    const adminBadge = container.querySelector('.watch-party-member-badge.is-admin');
    expect(adminBadge).not.toBeNull();
    expect(adminBadge.textContent).toBe('Admin');
  });
});
