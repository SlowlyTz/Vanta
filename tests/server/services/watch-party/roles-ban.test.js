import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({
  ItemsService: {
    getItemDetails: vi.fn(),
    getSeasons: vi.fn(),
    getEpisodes: vi.fn()
  }
}));

vi.mock('../../../../src/server/services/jellyfin/library.service.js', () => ({
  LibraryService: {
    getMovies: vi.fn(),
    getSeries: vi.fn()
  }
}));

import { ItemsService } from '../../../../src/server/services/jellyfin/items.service.js';
import { WatchPartyService } from '../../../../src/server/services/watch-party.service.js';
import { movieItem, createTestParty, joinAsViewer } from './helpers.js';

describe('WatchPartyService · Rollen und Ban', () => {
  beforeEach(() => {
    WatchPartyService.parties.clear();
    WatchPartyService.endedPartiesByOwner.clear();
    vi.clearAllMocks();
    ItemsService.getItemDetails.mockResolvedValue(movieItem());
  });

  it('promoteMember macht einen Viewer zu Admin', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);

    const updated = WatchPartyService.promoteMember({
      partyId: created.id,
      actorUserId: 'owner-1',
      targetUserId: 'viewer-1'
    });

    expect(updated.members.find(m => m.userId === 'viewer-1').role).toBe('admin');
  });

  it('promoteMember scheitert, wenn ein Viewer versucht zu befördern', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id, 'viewer-1', 'Bob');
    await joinAsViewer(created.id, 'viewer-2', 'Carl');

    expect(() => WatchPartyService.promoteMember({
      partyId: created.id,
      actorUserId: 'viewer-1',
      targetUserId: 'viewer-2'
    })).toThrow(expect.objectContaining({ status: 403 }));
  });

  it('ein beförderter Admin darf ebenfalls befördern', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id, 'viewer-1', 'Bob');
    await joinAsViewer(created.id, 'viewer-2', 'Carl');
    WatchPartyService.promoteMember({ partyId: created.id, actorUserId: 'owner-1', targetUserId: 'viewer-1' });

    const updated = WatchPartyService.promoteMember({
      partyId: created.id,
      actorUserId: 'viewer-1',
      targetUserId: 'viewer-2'
    });

    expect(updated.members.find(m => m.userId === 'viewer-2').role).toBe('admin');
  });

  it('banMember entfernt den Nutzer aus members und merkt ihn in bannedUserIds vor', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);

    const result = WatchPartyService.banMember({
      partyId: created.id,
      actorUserId: 'owner-1',
      targetUserId: 'viewer-1'
    });

    expect(result.party.members.some(m => m.userId === 'viewer-1')).toBe(false);
    expect(result.bannedUser).toEqual({ userId: 'viewer-1', username: 'Bob' });

    const party = WatchPartyService.parties.get(created.id);
    expect(party.bannedUserIds.has('viewer-1')).toBe(true);
  });

  it('joinParty wirft 403, wenn der Nutzer gebannt wurde', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);
    WatchPartyService.banMember({ partyId: created.id, actorUserId: 'owner-1', targetUserId: 'viewer-1' });

    await expect(joinAsViewer(created.id)).rejects.toMatchObject({ status: 403 });
  });

  it('Admin darf einen Viewer bannen', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id, 'viewer-1', 'Bob');
    await joinAsViewer(created.id, 'viewer-2', 'Carl');
    WatchPartyService.promoteMember({ partyId: created.id, actorUserId: 'owner-1', targetUserId: 'viewer-1' });

    const result = WatchPartyService.banMember({
      partyId: created.id,
      actorUserId: 'viewer-1',
      targetUserId: 'viewer-2'
    });

    expect(result.bannedUser.userId).toBe('viewer-2');
  });

  it('Admin darf den Owner nicht bannen', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id, 'viewer-1', 'Bob');
    WatchPartyService.promoteMember({ partyId: created.id, actorUserId: 'owner-1', targetUserId: 'viewer-1' });

    expect(() => WatchPartyService.banMember({
      partyId: created.id,
      actorUserId: 'viewer-1',
      targetUserId: 'owner-1'
    })).toThrow(expect.objectContaining({ status: 403 }));
  });

  it('nur der Owner darf einen anderen Admin bannen', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id, 'viewer-1', 'Bob');
    await joinAsViewer(created.id, 'viewer-2', 'Carl');
    WatchPartyService.promoteMember({ partyId: created.id, actorUserId: 'owner-1', targetUserId: 'viewer-1' });
    WatchPartyService.promoteMember({ partyId: created.id, actorUserId: 'owner-1', targetUserId: 'viewer-2' });

    expect(() => WatchPartyService.banMember({
      partyId: created.id,
      actorUserId: 'viewer-1',
      targetUserId: 'viewer-2'
    })).toThrow(expect.objectContaining({ status: 403 }));

    const result = WatchPartyService.banMember({
      partyId: created.id,
      actorUserId: 'owner-1',
      targetUserId: 'viewer-2'
    });
    expect(result.bannedUser.userId).toBe('viewer-2');
  });

  it('ein Nutzer kann sich nicht selbst bannen oder befördern', async () => {
    const created = await createTestParty();

    expect(() => WatchPartyService.banMember({
      partyId: created.id,
      actorUserId: 'owner-1',
      targetUserId: 'owner-1'
    })).toThrow(expect.objectContaining({ status: 400 }));

    expect(() => WatchPartyService.promoteMember({
      partyId: created.id,
      actorUserId: 'owner-1',
      targetUserId: 'owner-1'
    })).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('Viewer darf niemanden bannen', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id, 'viewer-1', 'Bob');
    await joinAsViewer(created.id, 'viewer-2', 'Carl');

    expect(() => WatchPartyService.banMember({
      partyId: created.id,
      actorUserId: 'viewer-1',
      targetUserId: 'viewer-2'
    })).toThrow(expect.objectContaining({ status: 403 }));
  });
});
