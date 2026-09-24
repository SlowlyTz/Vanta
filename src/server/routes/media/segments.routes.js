import express from 'express';
import { SegmentsService } from '../../services/jellyfin/segments.service.js';
import { requireAuth, isUpstreamUnauthorized, destroyInvalidSession } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = express.Router();

// Intro, recap, credits and preview ranges of an item, for "skip intro" and
// the next-episode prompt. An empty list when the item has none.
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const segments = await SegmentsService.getSegments(userId, accessToken, id);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.json({ segments });
  } catch (error) {
    console.error(`[Media Segments Error] ID ${id}:`, error.message);
    if (isUpstreamUnauthorized(error)) return destroyInvalidSession(req, res);
    return res.json({ segments: [] });
  }
}));

export default router;
