// Intro, recap, credits and preview ranges of an item, for "skip intro" and
// the next-episode prompt.
import express from 'express';
import { SegmentsService } from '../../services/jellyfin/segments.service.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { jellyfinRoute } from '../../utils/jellyfinRoute.js';
import { validateIdParam } from '../../utils/ids.js';

const router = express.Router();

router.param('id', validateIdParam);

// An item without segments, or one Jellyfin cannot answer for, has an empty list.
router.get('/:id', requireAuth, jellyfinRoute('Media Segments Error', 'Segmente konnten nicht geladen werden', async (req, res) => {
  const segments = await SegmentsService.getSegments(req.session.userId, req.session.accessToken, req.params.id);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.json({ segments });
}, { fallback: (req, res) => res.json({ segments: [] }) }));

export default router;
