export const connectionRegistryMethods = {
  registerConnection(partyId, userId, ws) {
    if (!this.connectionsByParty.has(partyId)) this.connectionsByParty.set(partyId, new Map());
    const byUser = this.connectionsByParty.get(partyId);
    if (!byUser.has(userId)) byUser.set(userId, new Set());
    byUser.get(userId).add(ws);
  },

  unregisterConnection(partyId, userId, ws) {
    const byUser = this.connectionsByParty.get(partyId);
    if (!byUser) return;
    const sockets = byUser.get(userId);
    if (!sockets) return;
    sockets.delete(ws);
    if (sockets.size === 0) byUser.delete(userId);
    if (byUser.size === 0) this.connectionsByParty.delete(partyId);
  },

  sendTo(ws, payload) {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify(payload));
  },

  sendToUser(partyId, userId, payload) {
    const sockets = this.connectionsByParty.get(partyId)?.get(userId);
    if (!sockets) return;
    for (const ws of sockets) this.sendTo(ws, payload);
  },

  closeUserConnections(partyId, userId) {
    const sockets = this.connectionsByParty.get(partyId)?.get(userId);
    if (!sockets) return;
    for (const ws of [...sockets]) ws.close();
  },

  // Every watch-party connection of one user, in any party (a ban).
  closeAllUserConnections(userId, code = 4001, reason = 'Session ended') {
    for (const byUser of this.connectionsByParty.values()) {
      const sockets = byUser.get(userId);
      if (!sockets) continue;
      for (const ws of [...sockets]) ws.close(code, reason);
    }
  },

  broadcastParty(partyId, payload, { skipUserId } = {}) {
    const byUser = this.connectionsByParty.get(partyId);
    if (!byUser) return;
    for (const [userId, sockets] of byUser) {
      if (skipUserId && userId === skipUserId) continue;
      for (const ws of sockets) this.sendTo(ws, payload);
    }
  }
};
