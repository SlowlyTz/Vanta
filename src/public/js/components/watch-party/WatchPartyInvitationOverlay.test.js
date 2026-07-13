import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let capturedListener = null;

vi.mock('../../store/watch-party-invitations.store.js', () => ({
  watchPartyInvitationStore: {
    subscribe: vi.fn(listener => {
      capturedListener = listener;
      listener({ invitations: [] });
      return vi.fn();
    }),
    remove: vi.fn()
  }
}));

vi.mock('../../api/watch-party.api.js', () => ({
  WatchPartyApi: {
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn()
  }
}));

vi.mock('../../store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

import { mountWatchPartyInvitationOverlay } from './WatchPartyInvitationOverlay.js';
import { watchPartyInvitationStore } from '../../store/watch-party-invitations.store.js';
import { WatchPartyApi } from '../../api/watch-party.api.js';
import { appStore } from '../../store/app.store.js';

function invitation(overrides = {}) {
  return {
    id: 'inv-1',
    inviterUsername: 'Alice',
    itemName: 'Blade Runner',
    ...overrides
  };
}

describe('WatchPartyInvitationOverlay', () => {
  let cleanup;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedListener = null;
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup?.();
    document.querySelectorAll('.watch-party-invitation-stack').forEach(el => el.remove());
  });

  it('hängt den Stack an document.body und rendert initial keine Karten', () => {
    cleanup = mountWatchPartyInvitationOverlay();
    const stack = document.body.querySelector('.watch-party-invitation-stack');
    expect(stack).not.toBeNull();
    expect(stack.children.length).toBe(0);
  });

  it('rendert eine Karte je pending Invitation mit Text und Buttons', () => {
    cleanup = mountWatchPartyInvitationOverlay();
    capturedListener({ invitations: [invitation()] });

    const card = document.querySelector('.watch-party-invitation-card');
    expect(card).not.toBeNull();
    expect(card.querySelector('.watch-party-invitation-kicker').textContent).toBe('Watch Party');
    expect(card.querySelector('.watch-party-invitation-persist').textContent).toBe('Bleibt offen');
    expect(card.querySelector('.watch-party-invitation-title').textContent).toContain('Alice lädt dich ein');
    expect(card.querySelector('.watch-party-invitation-media').textContent).toBe('Blade Runner');
    expect(card.querySelector('.watch-party-invitation-accept')).not.toBeNull();
    expect(card.querySelector('.watch-party-invitation-decline')).not.toBeNull();
  });

  it('Annehmen ruft acceptInvitation auf, entfernt die Karte lokal und navigiert', async () => {
    WatchPartyApi.acceptInvitation.mockResolvedValue({ navigateTo: '#/watch-party/party-1' });
    cleanup = mountWatchPartyInvitationOverlay();
    capturedListener({ invitations: [invitation()] });

    document.querySelector('.watch-party-invitation-accept').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(WatchPartyApi.acceptInvitation).toHaveBeenCalledWith('inv-1');
    expect(watchPartyInvitationStore.remove).toHaveBeenCalledWith('inv-1');
    expect(window.location.hash).toBe('#/watch-party/party-1');
  });

  it('Ablehnen ruft declineInvitation auf und entfernt die Karte lokal ohne Navigation', async () => {
    WatchPartyApi.declineInvitation.mockResolvedValue({});
    cleanup = mountWatchPartyInvitationOverlay();
    capturedListener({ invitations: [invitation()] });

    document.querySelector('.watch-party-invitation-decline').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(WatchPartyApi.declineInvitation).toHaveBeenCalledWith('inv-1');
    expect(watchPartyInvitationStore.remove).toHaveBeenCalledWith('inv-1');
  });

  it('zeigt bei einem Fehler einen Toast und reaktiviert die Buttons', async () => {
    WatchPartyApi.acceptInvitation.mockRejectedValue(new Error('Diese Watch Party ist voll.'));
    cleanup = mountWatchPartyInvitationOverlay();
    capturedListener({ invitations: [invitation()] });

    const acceptButton = document.querySelector('.watch-party-invitation-accept');
    acceptButton.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(appStore.showToast).toHaveBeenCalledWith('Diese Watch Party ist voll.', 'error');
    expect(acceptButton.disabled).toBe(false);
  });

  it('unmount entfernt den Stack aus dem DOM', () => {
    cleanup = mountWatchPartyInvitationOverlay();
    cleanup();
    cleanup = null;

    expect(document.body.querySelector('.watch-party-invitation-stack')).toBeNull();
  });
});
