import express from 'express';
import { WatchPartyInvitationService } from '../services/watch-party-invitation.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { appSocketHub } from '../realtime/app.socket.js';

const router = express.Router();

router.get('/pending', requireAuth, asyncHandler(async (req, res) => {
  const invitations = WatchPartyInvitationService.getPendingForUser(req.session.userId);
  return res.json({ invitations });
}));

router.post('/:invitationId/accept', requireAuth, asyncHandler(async (req, res) => {
  const { invitation, party } = WatchPartyInvitationService.acceptInvitation({
    invitationId: req.params.invitationId,
    userId: req.session.userId
  });

  appSocketHub.sendToUser(invitation.invitedUserId, {
    type: 'WATCH_PARTY_INVITATION_RESOLVED',
    invitationId: invitation.id,
    status: 'accepted'
  });

  appSocketHub.sendToUser(invitation.inviterUserId, {
    type: 'WATCH_PARTY_INVITATION_RESPONSE',
    invitationId: invitation.id,
    partyId: invitation.partyId,
    status: 'accepted',
    username: invitation.invitedUsername,
    message: `${invitation.invitedUsername} hat deine Einladung angenommen.`
  });

  return res.json({
    invitation,
    navigateTo: `#/watch-party/${party.id}`
  });
}));

router.post('/:invitationId/decline', requireAuth, asyncHandler(async (req, res) => {
  const { invitation } = WatchPartyInvitationService.declineInvitation({
    invitationId: req.params.invitationId,
    userId: req.session.userId
  });

  appSocketHub.sendToUser(invitation.invitedUserId, {
    type: 'WATCH_PARTY_INVITATION_RESOLVED',
    invitationId: invitation.id,
    status: 'declined'
  });

  appSocketHub.sendToUser(invitation.inviterUserId, {
    type: 'WATCH_PARTY_INVITATION_RESPONSE',
    invitationId: invitation.id,
    partyId: invitation.partyId,
    status: 'declined',
    username: invitation.invitedUsername,
    message: `${invitation.invitedUsername} hat deine Einladung abgelehnt.`
  });

  return res.json({ invitation });
}));

export default router;
