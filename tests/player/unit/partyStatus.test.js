import { describe, it, expect, vi } from 'vitest';
import { memberStatus } from '../../../src/player/src/partyStatus.js';
import { createPartyCard } from '../../../src/player/src/settings/partyCard.js';

describe('memberStatus', () => {
  it('beschreibt Verbindung und Zustand des Players', () => {
    expect(memberStatus({ connected: false, playbackState: 'sync' })).toEqual({ key: 'offline', label: 'Offline' });
    expect(memberStatus({ connected: true, playbackState: 'sync', driftMs: -42 })).toEqual({ key: 'sync', label: 'Synchron · ±42 ms' });
    expect(memberStatus({ connected: true, playbackState: 'buffering' }).label).toBe('Puffert …');
    expect(memberStatus({ connected: true })).toEqual({ key: 'unknown', label: 'Verbunden' });
  });
});

describe('createPartyCard', () => {
  it('zeigt alle Teilnehmer mit Statuspunkt und den eigenen Sync-Stand', () => {
    const watchParty = {
      participants: [
        { userId: 'a', username: 'Lena', connected: true, playbackState: 'sync', driftMs: 30 },
        { userId: 'b', username: 'Jonas', connected: true, playbackState: 'buffering' },
        { userId: 'c', username: 'Mia', connected: false }
      ],
      getSyncStatus: () => ({ kind: 'sync', label: 'Synchron · ±12 ms' }),
      onResync: vi.fn()
    };
    const card = createPartyCard(watchParty);
    const avatars = card.element.querySelectorAll('.vanta-settings-party-avatar');
    expect([...avatars].map(avatar => avatar.dataset.state)).toEqual(['sync', 'buffering', 'offline']);
    expect(avatars[1].getAttribute('aria-label')).toBe('Jonas: Puffert …');
    expect(card.element.querySelector('.vanta-settings-sync-label').textContent).toBe('Synchron · ±12 ms');

    card.element.querySelector('.vanta-settings-sync-button').click();
    expect(watchParty.onResync).toHaveBeenCalled();

    watchParty.participants[1].playbackState = 'sync';
    card.update();
    expect(card.element.querySelectorAll('.vanta-settings-party-avatar')[1].dataset.state).toBe('sync');
  });
});
