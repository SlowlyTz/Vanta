import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({ queryUserItems: vi.fn(async () => ({ Items: [] })), ItemsService: {} }));

describe('startWatchPartyCleanup', () => {
  it('clears out dead parties and stale invitations on every tick', async () => {
    vi.useFakeTimers();
    const { WatchPartyService, startWatchPartyCleanup } = await import('../../../../src/server/services/watch-party.service.js');
    const { WatchPartyInvitationService } = await import('../../../../src/server/services/watch-party-invitation.service.js');
    const parties = vi.spyOn(WatchPartyService, 'cleanupExpired').mockReturnValue(['party-1']);
    const invitations = vi.spyOn(WatchPartyInvitationService, 'cleanupExpired');
    const onRemoved = vi.fn();

    const interval = startWatchPartyCleanup({ intervalMs: 1000, onRemoved });
    await vi.advanceTimersByTimeAsync(1000);

    expect(parties).toHaveBeenCalled();
    expect(onRemoved).toHaveBeenCalledWith('party-1');
    expect(invitations).toHaveBeenCalled();
    clearInterval(interval);
    vi.useRealTimers();
  });
});
