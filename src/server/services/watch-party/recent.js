import { MAX_PARTY_MEMBERS } from './helpers.js';

export const RECENT_PARTIES_LIMIT = 5;

// "Zuletzt dabei": the parties a user joined, newest first, as long as they
// still run and the user was not banned. Kept in memory like the parties.
export const recentPartyMethods = {
  rememberRecentParty(userId, partyId, now = Date.now()) {
    if (!userId || !partyId) return;
    let entries = this.recentPartiesByUser.get(userId);
    if (!entries) {
      entries = new Map();
      this.recentPartiesByUser.set(userId, entries);
    }
    entries.set(partyId, now);
  },

  forgetRecentParty(userId, partyId) {
    const entries = this.recentPartiesByUser.get(userId);
    if (!entries) return;
    entries.delete(partyId);
    if (!entries.size) this.recentPartiesByUser.delete(userId);
  },

  getRecentPartiesForUser(userId, { limit = RECENT_PARTIES_LIMIT } = {}) {
    const entries = this.recentPartiesByUser.get(userId);
    if (!entries) return [];

    return [...entries]
      .map(([partyId, lastSeenAt]) => ({ party: this.parties.get(partyId), lastSeenAt }))
      .filter(({ party }) => party && party.status !== 'ended' && !party.bannedUserIds?.has(userId))
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .slice(0, limit)
      .map(({ party, lastSeenAt }) => {
        const member = party.members.get(userId);
        const members = [...party.members.values()];
        return {
          id: party.id,
          itemSnapshot: party.itemSnapshot,
          ownerName: party.ownerName,
          status: party.status,
          memberCount: members.length,
          connectedCount: members.filter(entry => entry.connected).length,
          maxMembers: MAX_PARTY_MEMBERS,
          role: member?.role || null,
          // A kicked user is no member any more and needs a free seat.
          full: !member && members.length >= MAX_PARTY_MEMBERS,
          lastSeenAt
        };
      });
  },

  pruneRecentParties() {
    for (const [userId, entries] of this.recentPartiesByUser) {
      for (const partyId of entries.keys()) {
        if (!this.parties.has(partyId)) entries.delete(partyId);
      }
      if (!entries.size) this.recentPartiesByUser.delete(userId);
    }
  }
};
