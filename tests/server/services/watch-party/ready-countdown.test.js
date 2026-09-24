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

describe('WatchPartyService · Ready Room und Countdown', () => {
  beforeEach(() => {
    WatchPartyService.parties.clear();
    WatchPartyService.endedPartiesByOwner.clear();
    vi.clearAllMocks();
    ItemsService.getItemDetails.mockResolvedValue(movieItem());
  });

  it('öffnet per Owner-Start erst den Ready-Room und startet Countdown erst wenn alle ready sind', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);

    const readyRoom = WatchPartyService.openReadyRoom({ partyId: created.id, ownerUserId: 'owner-1' });
    expect(readyRoom.status).toBe('ready-room');
    expect(readyRoom.members.get('owner-1').ready).toBe(false);
    expect(readyRoom.members.get('viewer-1').preloadState).toBe('idle');

    expect(WatchPartyService.beginCountdownIfReady({ partyId: created.id })).toBeNull();

    WatchPartyService.setPlayerReady({ partyId: created.id, userId: 'owner-1', ready: true, state: 'ready' });
    WatchPartyService.setPlayerReady({ partyId: created.id, userId: 'viewer-1', ready: true, state: 'ready' });

    const countdown = WatchPartyService.beginCountdownIfReady({ partyId: created.id });
    expect(countdown.party.status).toBe('countdown');
    expect(countdown.positionMs).toBe(0);
    expect(countdown.startsAtServerTimeMs).toBeGreaterThan(Date.now());
  });

  it('wechselt von countdown zu playing über beginPlayback', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);
    WatchPartyService.openReadyRoom({ partyId: created.id, ownerUserId: 'owner-1' });
    WatchPartyService.setPlayerReady({ partyId: created.id, userId: 'owner-1', ready: true, state: 'ready' });
    WatchPartyService.setPlayerReady({ partyId: created.id, userId: 'viewer-1', ready: true, state: 'ready' });
    const { startsAtServerTimeMs, party: countdownParty } = WatchPartyService.beginCountdownIfReady({ partyId: created.id });
    const seqBefore = countdownParty.seq;

    const party = WatchPartyService.beginPlayback({ partyId: created.id });
    expect(party.status).toBe('playing');
    // The start keeps the anchor the countdown announced; nothing moves.
    expect(party.lastServerTimeMs).toBe(startsAtServerTimeMs);
    expect(party.seq).toBe(seqBefore);
  });

  it('setPreloadState("ready") setzt das Mitglied ready, "error" nicht', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);

    const readyParty = WatchPartyService.setPreloadState({ partyId: created.id, userId: 'viewer-1', state: 'ready', message: 'Bereit' });
    expect(readyParty.members.find(m => m.userId === 'viewer-1').ready).toBe(true);

    const errorParty = WatchPartyService.setPreloadState({ partyId: created.id, userId: 'viewer-1', state: 'error', message: 'Kaputt' });
    expect(errorParty.members.find(m => m.userId === 'viewer-1').ready).toBe(false);
    expect(errorParty.members.find(m => m.userId === 'viewer-1').preloadMessage).toBe('Kaputt');
  });

  it('beginCountdownIfReady nutzt party.positionMs statt immer 0 (z.B. nach einem Resume)', async () => {
    const created = await createTestParty();
    WatchPartyService.endParty({ partyId: created.id, ownerUserId: 'owner-1', positionMs: 60_000 });
    const resumed = WatchPartyService.resumeEndedParty({ userId: 'owner-1', username: 'Alice', originalPartyId: created.id });
    await joinAsViewer(resumed.id);
    WatchPartyService.openReadyRoom({ partyId: resumed.id, ownerUserId: 'owner-1' });
    WatchPartyService.setPlayerReady({ partyId: resumed.id, userId: 'owner-1', ready: true, state: 'ready' });
    WatchPartyService.setPlayerReady({ partyId: resumed.id, userId: 'viewer-1', ready: true, state: 'ready' });

    const { positionMs } = WatchPartyService.beginCountdownIfReady({ partyId: resumed.id });
    expect(positionMs).toBe(60_000);
  });

  it('beginCountdownIfReady setzt 5 gezählte Sekunden plus Vorlauf und legt die Zeitleiste auf den Start', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);
    WatchPartyService.openReadyRoom({ partyId: created.id, ownerUserId: 'owner-1' });
    WatchPartyService.setPlayerReady({ partyId: created.id, userId: 'owner-1', ready: true, state: 'ready' });
    WatchPartyService.setPlayerReady({ partyId: created.id, userId: 'viewer-1', ready: true, state: 'ready' });

    const { startsAtServerTimeMs, durationMs, party } = WatchPartyService.beginCountdownIfReady({ partyId: created.id });
    expect(durationMs).toBe(5000);
    expect(startsAtServerTimeMs - Date.now()).toBeGreaterThanOrEqual(5390);
    expect(startsAtServerTimeMs - Date.now()).toBeLessThanOrEqual(5400);
    expect(WatchPartyService.serializeParty(party).timeline).toMatchObject({ playing: true, anchorServerTimeMs: startsAtServerTimeMs, positionMs: 0 });
  });

  it('setPreloadState("blocked") setzt das Mitglied nicht ready, beeinflusst canStart aber nicht mehr', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);

    const blockedParty = WatchPartyService.setPreloadState({ partyId: created.id, userId: 'viewer-1', state: 'blocked', message: 'Autoplay blockiert' });
    expect(blockedParty.members.find(m => m.userId === 'viewer-1').ready).toBe(false);
  });

  it('canStart erfordert ready-room und alle Mitglieder ready', async () => {
    const created = await createTestParty();
    const party = WatchPartyService.parties.get(created.id);
    expect(WatchPartyService.canStart(party)).toBe(false);

    await joinAsViewer(created.id);
    WatchPartyService.openReadyRoom({ partyId: created.id, ownerUserId: 'owner-1' });
    expect(WatchPartyService.canStart(party)).toBe(false);

    WatchPartyService.setPlayerReady({ partyId: created.id, userId: 'owner-1', ready: true, state: 'ready' });
    expect(WatchPartyService.canStart(party)).toBe(false);

    WatchPartyService.setPlayerReady({ partyId: created.id, userId: 'viewer-1', ready: true, state: 'ready' });
    expect(WatchPartyService.canStart(party)).toBe(true);
  });

  it('merkt sich den Ladefortschritt pro Mitglied und setzt ihn beim Öffnen des Ready-Rooms zurück', async () => {
    const created = await createTestParty();
    await joinAsViewer(created.id);
    WatchPartyService.openReadyRoom({ partyId: created.id, ownerUserId: 'owner-1' });

    WatchPartyService.setPlayerReady({ partyId: created.id, userId: 'viewer-1', ready: false, state: 'preparing', progress: 0.42 });
    let viewer = WatchPartyService.serializeParty(WatchPartyService.parties.get(created.id)).members.find(m => m.userId === 'viewer-1');
    expect(viewer).toMatchObject({ preloadState: 'preparing', preloadProgress: 0.42, ready: false });

    WatchPartyService.setPlayerReady({ partyId: created.id, userId: 'viewer-1', ready: false, state: 'preparing', progress: 7 });
    viewer = WatchPartyService.serializeParty(WatchPartyService.parties.get(created.id)).members.find(m => m.userId === 'viewer-1');
    expect(viewer.preloadProgress).toBe(1);

    WatchPartyService.setPlayerReady({ partyId: created.id, userId: 'owner-1', ready: true, state: 'ready' });
    const owner = WatchPartyService.serializeParty(WatchPartyService.parties.get(created.id)).members.find(m => m.userId === 'owner-1');
    expect(owner).toMatchObject({ ready: true, preloadProgress: 1 });
  });
});
