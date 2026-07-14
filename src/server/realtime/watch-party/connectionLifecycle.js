import { WatchPartyService, getPartyEffectivePosition } from '../../services/watch-party.service.js';
import { createNotification } from './notifications.js';

export const connectionLifecycleMethods = {
  handleConnection({ ws, partyId, user }) {
    let party;
    try {
      party = WatchPartyService.getPartyOrThrow(partyId);
    } catch (error) {
      this.sendTo(ws, { type: 'ERROR', message: error.message });
      ws.close();
      return;
    }

    if (!party.members.has(user.userId)) {
      this.sendTo(ws, { type: 'ERROR', message: 'Du bist kein Mitglied dieser Watch Party' });
      ws.close();
      return;
    }

    const member = party.members.get(user.userId);
    const wasConnected = Boolean(member.connected);
    const wasSeenBefore = Boolean(member.hasConnectedOnce);

    this.registerConnection(partyId, user.userId, ws);
    WatchPartyService.setConnected({ partyId, userId: user.userId, connected: true });
    member.hasConnectedOnce = true;

    if (party.ownerUserId === user.userId) {
      this.cancelOwnerDisconnectTimer(partyId);
    }

    this.sendTo(ws, {
      type: 'PARTY_STATE',
      party: WatchPartyService.serializeParty(party, user.userId),
      effectivePositionMs: getPartyEffectivePosition(party),
      serverTimeMs: Date.now()
    });

    if (!wasConnected) {
      this.broadcastParty(
        partyId,
        createNotification(wasSeenBefore ? 'member_rejoined' : 'member_joined', { username: member.username }),
        { skipUserId: user.userId }
      );
    }

    this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(party) });

    ws.on('message', raw => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }
      this.handleMessage({ partyId, user, message, ws });
    });

    ws.on('close', () => {
      this.unregisterConnection(partyId, user.userId, ws);

      const stillConnected = this.connectionsByParty.get(partyId)?.get(user.userId)?.size > 0;
      if (stillConnected) return;

      WatchPartyService.setConnected({ partyId, userId: user.userId, connected: false });
      const currentParty = WatchPartyService.parties.get(partyId);
      if (!currentParty) return;

      if (currentParty.ownerUserId === user.userId && currentParty.status !== 'ended') {
        this.scheduleOwnerDisconnectEnd(partyId, user.userId);
      }

      this.broadcastParty(
        partyId,
        createNotification('member_left', { username: user.username }),
        { skipUserId: user.userId }
      );

      this.broadcastParty(partyId, { type: 'PARTY_UPDATED', party: WatchPartyService.serializeParty(currentParty) });
    });
  }
};
