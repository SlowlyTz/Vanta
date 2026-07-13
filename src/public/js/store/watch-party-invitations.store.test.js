import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/watch-party.api.js', () => ({
  WatchPartyApi: {
    pendingInvitations: vi.fn()
  }
}));

vi.mock('./app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

import { WatchPartyApi } from '../api/watch-party.api.js';
import { appStore } from './app.store.js';
import { watchPartyInvitationStore } from './watch-party-invitations.store.js';

const FIXED_NOW = Date.now();

function invitation(overrides = {}) {
  return {
    id: 'inv-1',
    partyId: 'party-1',
    inviterUserId: 'owner-1',
    inviterUsername: 'Alice',
    invitedUserId: 'viewer-1',
    invitedUsername: 'Bob',
    itemName: 'Blade Runner',
    status: 'pending',
    createdAt: FIXED_NOW,
    expiresAt: FIXED_NOW + 900_000,
    ...overrides
  };
}

describe('watchPartyInvitationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watchPartyInvitationStore.invitations = new Map();
    watchPartyInvitationStore.listeners = new Set();
  });

  it('subscribe ruft den Listener sofort mit dem aktuellen State auf', () => {
    const listener = vi.fn();
    watchPartyInvitationStore.subscribe(listener);

    expect(listener).toHaveBeenCalledWith({ invitations: [] });
  });

  it('loadPending lädt Invitations per REST und benachrichtigt Listener', async () => {
    WatchPartyApi.pendingInvitations.mockResolvedValue({ invitations: [invitation()] });
    const listener = vi.fn();
    watchPartyInvitationStore.subscribe(listener);
    listener.mockClear();

    await watchPartyInvitationStore.loadPending();

    expect(listener).toHaveBeenCalledWith({ invitations: [invitation()] });
  });

  it('loadPending wirft nicht bei einem API-Fehler', async () => {
    WatchPartyApi.pendingInvitations.mockRejectedValue(new Error('network error'));

    await expect(watchPartyInvitationStore.loadPending()).resolves.toBeUndefined();
  });

  it('WATCH_PARTY_INVITATION fügt eine neue Einladung hinzu', () => {
    const listener = vi.fn();
    watchPartyInvitationStore.subscribe(listener);
    listener.mockClear();

    watchPartyInvitationStore.handleRealtimeMessage({ type: 'WATCH_PARTY_INVITATION', invitation: invitation() });

    expect(watchPartyInvitationStore.getState().invitations).toEqual([invitation()]);
    expect(listener).toHaveBeenCalled();
  });

  it('WATCH_PARTY_INVITATION_RESOLVED entfernt die Einladung', () => {
    watchPartyInvitationStore.invitations.set('inv-1', invitation());
    const listener = vi.fn();
    watchPartyInvitationStore.subscribe(listener);
    listener.mockClear();

    watchPartyInvitationStore.handleRealtimeMessage({ type: 'WATCH_PARTY_INVITATION_RESOLVED', invitationId: 'inv-1', status: 'accepted' });

    expect(watchPartyInvitationStore.getState().invitations).toEqual([]);
    expect(listener).toHaveBeenCalled();
  });

  it('WATCH_PARTY_INVITATION_RESOLVED für unbekannte ID benachrichtigt keine Listener erneut', () => {
    const listener = vi.fn();
    watchPartyInvitationStore.subscribe(listener);
    listener.mockClear();

    watchPartyInvitationStore.handleRealtimeMessage({ type: 'WATCH_PARTY_INVITATION_RESOLVED', invitationId: 'unknown', status: 'accepted' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('WATCH_PARTY_INVITATION_RESPONSE zeigt einen Success-Toast bei accepted', () => {
    watchPartyInvitationStore.handleRealtimeMessage({
      type: 'WATCH_PARTY_INVITATION_RESPONSE',
      status: 'accepted',
      message: 'Bob hat deine Einladung angenommen.'
    });

    expect(appStore.showToast).toHaveBeenCalledWith('Bob hat deine Einladung angenommen.', 'success');
  });

  it('WATCH_PARTY_INVITATION_RESPONSE zeigt einen Info-Toast bei declined', () => {
    watchPartyInvitationStore.handleRealtimeMessage({
      type: 'WATCH_PARTY_INVITATION_RESPONSE',
      status: 'declined',
      message: 'Bob hat deine Einladung abgelehnt.'
    });

    expect(appStore.showToast).toHaveBeenCalledWith('Bob hat deine Einladung abgelehnt.', 'info');
  });

  it('remove entfernt eine Einladung lokal (z.B. nach eigenem Accept/Decline)', () => {
    watchPartyInvitationStore.invitations.set('inv-1', invitation());
    const listener = vi.fn();
    watchPartyInvitationStore.subscribe(listener);
    listener.mockClear();

    watchPartyInvitationStore.remove('inv-1');

    expect(watchPartyInvitationStore.getState().invitations).toEqual([]);
    expect(listener).toHaveBeenCalled();
  });

  it('clear leert alle Invitations (z.B. bei Logout)', () => {
    watchPartyInvitationStore.invitations.set('inv-1', invitation());
    const listener = vi.fn();
    watchPartyInvitationStore.subscribe(listener);
    listener.mockClear();

    watchPartyInvitationStore.clear();

    expect(watchPartyInvitationStore.getState().invitations).toEqual([]);
    expect(listener).toHaveBeenCalled();
  });

  it('ignoriert unbekannte Message-Types ohne Fehler', () => {
    expect(() => watchPartyInvitationStore.handleRealtimeMessage({ type: 'SOMETHING_ELSE' })).not.toThrow();
    expect(() => watchPartyInvitationStore.handleRealtimeMessage(null)).not.toThrow();
  });
});
