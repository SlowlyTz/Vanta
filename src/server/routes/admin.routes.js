import express from 'express';
import { requireAuth, requireFreshAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SettingsService } from '../services/settings.service.js';

const router = express.Router();

router.get('/transcoding', requireAuth, requireFreshAdmin, asyncHandler(async (_req, res) => {
  const settings = SettingsService.getTranscodingSettings();
  res.json(settings);
}));

router.put('/transcoding', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  const { forceHlsTranscoding } = req.body;

  if (typeof forceHlsTranscoding !== 'boolean') {
    return res.status(400).json({ error: 'forceHlsTranscoding must be a boolean' });
  }

  const settings = SettingsService.updateTranscodingSettings({ forceHlsTranscoding });
  res.json(settings);
}));

export default router;
