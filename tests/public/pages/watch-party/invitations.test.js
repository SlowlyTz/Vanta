import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WatchPartyApi } from '../../../../src/public/js/api/watch-party.api.js';
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

describe('WatchPartyPage · Invite per Username', () => {
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
      expect(appStore.showToast).toHaveBeenCalledWith('Einladung an Bob gesendet.', 'success');
      expect(container.querySelector('.watch-party-invite-menu-overlay').hidden).toBe(true);
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
