import express from 'express';
import { WatchPartyService } from '../services/watch-party.service.js';
import { WatchPartyInvitationService } from '../services/watch-party-invitation.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { watchPartySocketHub } from '../realtime/watch-party.socket.js';
import { appSocketHub } from '../realtime/app.socket.js';

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

router.get('/suggestions', requireAuth, asyncHandler(async (req, res) => {
  const limit = Math.max(1, Math.min(36, parseInt(req.query.limit, 10) || 18));
  const items = await WatchPartyService.getSuggestions({
    userId: req.session.userId,
    accessToken: req.session.accessToken,
    limit
  });

  return res.json({ items });
}));

router.get('/resumable', requireAuth, asyncHandler(async (req, res) => {
  const snapshot = WatchPartyService.getResumableForOwner(req.session.userId);
  return res.json({ party: snapshot });
}));

router.post('/resume', requireAuth, asyncHandler(async (req, res) => {
  const { originalPartyId } = req.body || {};

  if (!originalPartyId) {
    return res.status(400).json({ error: 'originalPartyId is required' });
  }

  const party = WatchPartyService.resumeEndedParty({
    userId: req.session.userId,
    username: req.session.username,
    originalPartyId
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
  const party = await WatchPartyService.joinParty({
    partyId: req.params.partyId,
    userId: req.session.userId,
    username: req.session.username,
    accessToken: req.session.accessToken
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

router.post('/:partyId/end', requireAuth, asyncHandler(async (req, res) => {
  const { positionMs } = req.body || {};

  const party = WatchPartyService.endParty({
    partyId: req.params.partyId,
    ownerUserId: req.session.userId,
    positionMs: Number.isFinite(positionMs) ? positionMs : null,
    reason: 'owner-ended'
  });

  watchPartySocketHub.cancelOwnerDisconnectTimer(req.params.partyId);
  watchPartySocketHub.cancelCountdown(req.params.partyId);
  watchPartySocketHub.broadcastParty(party.id, {
    type: 'PARTY_ENDED',
    party,
    message: 'Die Watch Party wurde vom Owner beendet.'
  });

  return res.json({ party });
}));

router.post('/:partyId/invitations/resolve-user', requireAuth, asyncHandler(async (req, res) => {
  const user = WatchPartyInvitationService.resolveInviteeByUsername((req.body || {}).username);
  return res.json({
    user: user ? { id: user.userId, username: user.username } : null
  });
}));

router.post('/:partyId/invitations', requireAuth, asyncHandler(async (req, res) => {
  const invitation = WatchPartyInvitationService.createInvitation({
    partyId: req.params.partyId,
    inviterUserId: req.session.userId,
    invitedUsername: (req.body || {}).username
  });

  appSocketHub.sendToUser(invitation.invitedUserId, {
    type: 'WATCH_PARTY_INVITATION',
    invitation
  });

  return res.status(201).json({ invitation });
}));

export default router;
