import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchPartyApi } from '../api/watch-party.api.js';
import { MediaApi } from '../api/media.api.js';
import { authStore } from '../store/auth.store.js';
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
    reportPlayback: vi.fn()
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

vi.mock('/vendor/player/vanta-player.js', () => ({
  mountVantaPlayer: vi.fn().mockResolvedValue(fakeController)
}));

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
});
