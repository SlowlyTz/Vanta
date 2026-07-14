import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WatchPartyApi } from '../../../src/public/js/api/watch-party.api.js';

vi.mock('../../../src/public/js/api/client.js', () => ({
  request: vi.fn()
}));

import { request } from '../../../src/public/js/api/client.js';

describe('WatchPartyApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    request.mockResolvedValue({});
  });

  it('create sendet POST mit itemId', () => {
    WatchPartyApi.create('movie-1');
    expect(request).toHaveBeenCalledWith('/api/watch-parties', { method: 'POST', body: { itemId: 'movie-1' } });
  });

  it('get lädt eine Party per GET', () => {
    WatchPartyApi.get('party-1');
    expect(request).toHaveBeenCalledWith('/api/watch-parties/party-1');
  });

  it('join sendet POST an den Join-Endpunkt', () => {
    WatchPartyApi.join('party-1');
    expect(request).toHaveBeenCalledWith('/api/watch-parties/party-1/join', { method: 'POST' });
  });

  it('kick sendet POST mit userId', () => {
    WatchPartyApi.kick('party-1', 'viewer-1');
    expect(request).toHaveBeenCalledWith('/api/watch-parties/party-1/kick', { method: 'POST', body: { userId: 'viewer-1' } });
  });

  it('end sendet POST mit positionMs', () => {
    WatchPartyApi.end('party-1', 5000);
    expect(request).toHaveBeenCalledWith('/api/watch-parties/party-1/end', { method: 'POST', body: { positionMs: 5000 } });
  });

  it('resolveInviteUser sendet POST mit username an den resolve-user Endpunkt', () => {
    WatchPartyApi.resolveInviteUser('party-1', 'Bob');
    expect(request).toHaveBeenCalledWith('/api/watch-parties/party-1/invitations/resolve-user', {
      method: 'POST',
      body: { username: 'Bob' }
    });
  });

  it('sendInvitation sendet POST mit username an den invitations Endpunkt', () => {
    WatchPartyApi.sendInvitation('party-1', 'Bob');
    expect(request).toHaveBeenCalledWith('/api/watch-parties/party-1/invitations', {
      method: 'POST',
      body: { username: 'Bob' }
    });
  });

  it('pendingInvitations lädt GET /api/watch-party-invitations/pending', () => {
    WatchPartyApi.pendingInvitations();
    expect(request).toHaveBeenCalledWith('/api/watch-party-invitations/pending');
  });

  it('acceptInvitation sendet POST an den accept Endpunkt', () => {
    WatchPartyApi.acceptInvitation('inv-1');
    expect(request).toHaveBeenCalledWith('/api/watch-party-invitations/inv-1/accept', { method: 'POST' });
  });

  it('declineInvitation sendet POST an den decline Endpunkt', () => {
    WatchPartyApi.declineInvitation('inv-1');
    expect(request).toHaveBeenCalledWith('/api/watch-party-invitations/inv-1/decline', { method: 'POST' });
  });

  it('encoded Sonderzeichen in IDs für URL-Pfade', () => {
    WatchPartyApi.get('party/1');
    expect(request).toHaveBeenCalledWith('/api/watch-parties/party%2F1');
  });
});
