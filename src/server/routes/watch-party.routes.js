import express from 'express';
import { WatchPartyService } from '../services/watch-party.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { watchPartySocketHub } from '../realtime/watch-party.socket.js';

const router = express.Router();

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { userId, username, accessToken } = req.session;
  const { itemId } = req.body || {};

  if (!itemId) {
    return res.status(400).json({ error: 'itemId is required' });
  }

  const party = await WatchPartyService.createParty({
    userId,
    username,
    accessToken,
    itemId
  });

  return res.status(201).json({
    party,
    inviteUrl: `/#/watch-party/${party.id}`
  });
}));

router.get('/:partyId', requireAuth, asyncHandler(async (req, res) => {
  const party = WatchPartyService.getPartyOrThrow(req.params.partyId);
  return res.json({ party: WatchPartyService.serializeParty(party, req.session.userId) });
}));

router.post('/:partyId/join', requireAuth, asyncHandler(async (req, res) => {
  const party = WatchPartyService.joinParty({
    partyId: req.params.partyId,
    userId: req.session.userId,
    username: req.session.username
  });

  watchPartySocketHub.broadcastParty(party.id, {
    type: 'PARTY_UPDATED',
    party
  });

  return res.json({ party });
}));

router.post('/:partyId/ready', requireAuth, asyncHandler(async (req, res) => {
  const party = WatchPartyService.setReady({
    partyId: req.params.partyId,
    userId: req.session.userId,
    ready: Boolean((req.body || {}).ready)
  });

  watchPartySocketHub.broadcastParty(party.id, {
    type: 'PARTY_UPDATED',
    party
  });

  return res.json({ party });
}));

router.post('/:partyId/kick', requireAuth, asyncHandler(async (req, res) => {
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const party = WatchPartyService.kickMember({
    partyId: req.params.partyId,
    actorUserId: req.session.userId,
    targetUserId: userId
  });

  watchPartySocketHub.sendToUser(party.id, userId, { type: 'KICKED' });
  watchPartySocketHub.closeUserConnections(party.id, userId);
  watchPartySocketHub.broadcastParty(party.id, { type: 'PARTY_UPDATED', party });

  return res.json({ party });
}));

router.delete('/:partyId', requireAuth, asyncHandler(async (req, res) => {
  WatchPartyService.deleteParty({ partyId: req.params.partyId, userId: req.session.userId });
  watchPartySocketHub.broadcastParty(req.params.partyId, { type: 'ENDED' });
  return res.status(204).end();
}));

export default router;
