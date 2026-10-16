import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({ ItemsService: {} }));

describe('startWatchPartyCleanup', () => {
  it('clears out dead parties and stale invitations on every tick', async () => {
    vi.useFakeTimers();
    const { WatchPartyService, startWatchPartyCleanup } = await import('../../../../src/server/services/watch-party.service.js');
    const { WatchPartyInvitationService } = await import('../../../../src/server/services/watch-party-invitation.service.js');
    const parties = vi.spyOn(WatchPartyService, 'cleanupExpired');
    const invitations = vi.spyOn(WatchPartyInvitationService, 'cleanupExpired');

    const interval = startWatchPartyCleanup(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(parties).toHaveBeenCalled();
    expect(invitations).toHaveBeenCalled();
    clearInterval(interval);
    vi.useRealTimers();
  });
});
