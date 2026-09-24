import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchPartyApi } from '../../../../src/public/js/api/watch-party.api.js';
import { MediaApi } from '../../../../src/public/js/api/media.api.js';
import { authStore } from '../../../../src/public/js/store/auth.store.js';
import WatchPartyPage from '../../../../src/public/js/pages/watch-party.page.js';
import { makeParty, flush, createFakeController } from './helpers.js';

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

mountVantaPlayer.mockResolvedValue(fakeController);

describe('WatchPartyPage · Lobby', () => {
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

  it('rendert Entfernen links von Verbunden in einer gemeinsamen Aktionsgruppe', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    const kickButton = container.querySelector('.watch-party-kick-button');
    expect(kickButton).not.toBeNull();
    const actions = kickButton.closest('.watch-party-member-actions');
    expect(actions).not.toBeNull();
    const status = actions.querySelector('.watch-party-member-status');
    expect(kickButton).not.toBeNull();
    expect(status).not.toBeNull();
    expect(kickButton.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('zeigt keine Kick-Buttons für Viewer', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    expect(container.querySelectorAll('.watch-party-kick-button').length).toBe(0);
  });

  it('zeigt den Ready-Button nicht in der Lobby an', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    expect(container.querySelector('.watch-party-ready-button').hidden).toBe(true);
    expect(container.querySelector('.watch-party-lobby').dataset.phase).toBe('waiting');
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
    expect(startButton.textContent).toBe('Party starten');
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

  it('zeigt Titel, Meta, Backdrop und den Fortsetzen-Punkt aus dem Snapshot, ohne das Item zu laden', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({
        positionMs: 65_000,
        itemSnapshot: {
          name: 'Pilot', type: 'Episode', seriesName: 'Dark', seasonNumber: 1, episodeNumber: 3,
          productionYear: 2017, officialRating: 'FSK 16', communityRating: 8.44, runtimeTicks: 30_000_000_000,
          backdrop: { id: 'series-1', tag: 'bd' }
        }
      })
    });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    expect(container.querySelector('.watch-party-hero-title').textContent).toBe('Dark');
    expect(container.querySelector('.watch-party-hero-subtitle').textContent).toBe('S1 · F3 · Pilot');
    expect([...container.querySelectorAll('.watch-party-hero-meta li')].map(li => li.textContent))
      .toEqual(['2017', 'FSK 16', '★ 8.4', '50 Min.']);
    expect(container.querySelector('.watch-party-hero-resume').textContent).toBe('Fortsetzen bei 1:05');
    expect(container.querySelector('.watch-party-hero-eyebrow').textContent).toBe('Watch Party von Alice');
    expect(MediaApi.getImageUrl).toHaveBeenCalledWith('series-1', 'Backdrop', 1920, { tag: 'bd', quality: 90 });
    expect(container.querySelector('.watch-party-backdrop').classList.contains('has-image')).toBe(true);
    expect(MediaApi.getItem).not.toHaveBeenCalled();
  });

  it('zeigt vier Plätze; freie Plätze laden nur den Gastgeber zum Einladen ein', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    expect(container.querySelectorAll('.watch-party-member')).toHaveLength(4);
    const invites = container.querySelectorAll('.watch-party-member-invite');
    expect(invites).toHaveLength(2);
    expect(container.querySelector('.watch-party-member-count').textContent).toBe('2/4');

    invites[0].click();
    expect(container.querySelector('.watch-party-invite-menu-overlay').hidden).toBe(false);
  });

  it('zeigt Zuschauern statt eines Start-Buttons einen Wartehinweis', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    expect(container.querySelector('.watch-party-start-button').hidden).toBe(true);
    expect(container.querySelector('.watch-party-member-invite')).toBeNull();
    expect(container.querySelector('.watch-party-start-hint').textContent).toBe('Warte, bis Alice die Party startet.');
    expect(container.querySelector('.watch-party-waiting-dots').hidden).toBe(false);
    expect(container.querySelector('.watch-party-owner-menu-button').hidden).toBe(true);
  });

  it('beendet die Party erst nach einer Bestätigung im Gastgeber-Menü', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
    WatchPartyApi.end.mockResolvedValue({});

    const container = WatchPartyPage({ partyId: 'party-1' });
    document.body.appendChild(container);
    await flush();

    const menuButton = container.querySelector('.watch-party-owner-menu-button');
    expect(menuButton.hidden).toBe(false);
    menuButton.click();
    const menu = container.querySelector('.watch-party-owner-menu');
    expect(menu.hidden).toBe(false);

    const endButton = container.querySelector('.watch-party-end-button');
    endButton.click();
    expect(WatchPartyApi.end).not.toHaveBeenCalled();
    expect(endButton.textContent).toBe('Wirklich für alle beenden?');

    endButton.click();
    expect(WatchPartyApi.end).toHaveBeenCalledWith('party-1', 0);
    expect(menu.hidden).toBe(true);
    container.remove();
  });

  it('bestätigt das Kopieren des Links direkt am Button', async () => {
    vi.useFakeTimers();
    try {
      authStore.getState.mockReturnValue({ user: { id: 'owner-1', name: 'Alice' } });
      WatchPartyApi.join.mockResolvedValue({ party: makeParty() });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue() }, configurable: true });

      const container = WatchPartyPage({ partyId: 'party-1' });
      await vi.advanceTimersByTimeAsync(10);

      const copyButton = container.querySelector('.watch-party-invite-copy');
      copyButton.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('#/watch-party/party-1'));
      expect(copyButton.classList.contains('is-copied')).toBe(true);
      expect(copyButton.textContent).toBe('Kopiert');

      await vi.advanceTimersByTimeAsync(2000);
      expect(copyButton.classList.contains('is-copied')).toBe(false);
      expect(copyButton.textContent).toBe('Link kopieren');
    } finally {
      vi.useRealTimers();
    }
  });
});
