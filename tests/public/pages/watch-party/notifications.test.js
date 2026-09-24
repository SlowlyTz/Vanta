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

describe('WatchPartyPage · Notifications', () => {
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
    expect(item.querySelector('.watch-party-notification-icon svg').dataset.icon).toBe('info');
    expect(item.querySelector('.watch-party-notification-avatar').classList.contains('is-system')).toBe(true);
  });

  it('zeigt eine lokale Notification, wenn die Wiedergabe automatisch hart synchronisiert wird', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({
      party: makeParty({ status: 'playing', positionMs: 0 })
    });
    MediaApi.getItem.mockResolvedValue({ Id: 'movie-1', Name: 'Test Movie' });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();
    await flush();

    fakeController.player.currentTime = 20;
    capturedOnMessage({
      type: 'TIMELINE',
      timeline: { positionMs: 1000, playing: true, anchorServerTimeMs: Date.now(), seq: 2 },
      actorUserId: 'owner-1',
      reason: 'sync'
    });

    const item = container.querySelector('.watch-party-notification.is-auto_sync');
    expect(item).not.toBeNull();
    expect(item.querySelector('.watch-party-notification-icon svg').dataset.icon).toBe('auto_sync');
    expect(item.querySelector('.watch-party-notification-text').textContent).toBe('Wiedergabe automatisch synchronisiert.');
    expect(fakeController.player.currentTime).toBeGreaterThanOrEqual(1);
    expect(fakeController.player.currentTime).toBeLessThan(1.5);
  });

  it('zeigt Avatar in der Personenfarbe, Aktions-Badge und den Namen fett', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    capturedOnMessage({
      type: 'NOTIFICATION',
      notification: {
        id: '1', type: 'owner_pause', icon: 'owner_pause', message: 'Lena hat pausiert.',
        actor: { userId: 'u-lena', username: 'Lena' }, createdAt: Date.now()
      }
    });

    const item = container.querySelector('.watch-party-notification');
    const avatar = item.querySelector('.watch-party-notification-avatar');
    expect(avatar.textContent).toBe('L');
    expect(avatar.style.getPropertyValue('--member-hue')).not.toBe('');
    expect(item.querySelector('.watch-party-notification-icon svg').dataset.icon).toBe('owner_pause');
    expect(item.querySelector('.watch-party-notification-text strong').textContent).toBe('Lena');
    expect(item.querySelector('.watch-party-notification-text').textContent).toBe('Lena hat pausiert.');
  });

  it('zeigt höchstens drei Benachrichtigungen gleichzeitig', async () => {
    authStore.getState.mockReturnValue({ user: { id: 'viewer-1', name: 'Bob' } });
    WatchPartyApi.join.mockResolvedValue({ party: makeParty() });

    const container = WatchPartyPage({ partyId: 'party-1' });
    await flush();

    for (let i = 0; i < 5; i++) {
      capturedOnMessage({ type: 'NOTIFICATION', notification: { id: String(i), type: 'owner_play', message: `Nr. ${i}` } });
    }

    const visible = container.querySelectorAll('.watch-party-notification:not(.is-leaving)');
    expect(visible).toHaveLength(3);
    expect(visible[0].textContent).toContain('Nr. 2');
  });
});
