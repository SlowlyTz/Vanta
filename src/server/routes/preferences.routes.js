import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UserPreferencesService } from '../services/user-preferences.service.js';

const router = express.Router();

// The signed-in user's settings (all keys, defaults filled in).
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(UserPreferencesService.get(req.session.userId));
}));

// Changes some of them; unknown keys and invalid values are ignored.
router.put('/', requireAuth, asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Ungültige Einstellungen' });
  }
  return res.json(UserPreferencesService.update(req.session.userId, req.body));
}));

export default router;
