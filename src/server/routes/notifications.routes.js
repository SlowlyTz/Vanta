import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotificationsService } from '../services/notifications.service.js';

const router = express.Router();

// Counts behind the dots in the menu. The admin part follows the role the
// session learned at login; the lists themselves still check it fresh.
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(NotificationsService.getSummary(req.session.userId, { isAdmin: req.session.isAdmin === true }));
}));

// The user opened "Meine Anfragen" / "Meine Meldungen". Answers with the time
// they last looked, so the list can mark what is new since then.
router.post('/seen', requireAuth, asyncHandler(async (req, res) => {
  try {
    const previousSeenAt = NotificationsService.markSeen(req.session.userId, req.body?.kind);
    res.json({ previousSeenAt });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }
}));

export default router;
