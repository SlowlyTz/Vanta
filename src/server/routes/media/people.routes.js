import express from 'express';
import { PeopleService } from '../../services/jellyfin/people.service.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = express.Router();

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const person = await PeopleService.getPersonDetails(userId, accessToken, id);
    return res.json(person);
  } catch (error) {
    console.error(`[Media Person Error] ID ${id}:`, error.message);
    return res.status(500).json({ error: 'Failed to fetch person details' });
  }
}));

router.get('/:id/items', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { id } = req.params;

  try {
    const items = await PeopleService.getPersonItems(userId, accessToken, id);
    return res.json(items);
  } catch (error) {
    console.error(`[Media Person Items Error] ID ${id}:`, error.message);
    return res.status(500).json({ error: 'Failed to fetch person items' });
  }
}));

router.get('/by-name/:name', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { name } = req.params;

  try {
    const person = await PeopleService.getPersonDetailsByName(userId, accessToken, name);
    return res.json(person);
  } catch (error) {
    console.error(`[Media Person By Name Error] ${name}:`, error.message);
    return res.status(500).json({ error: 'Failed to find person details' });
  }
}));

router.get('/by-name/:name/items', requireAuth, asyncHandler(async (req, res) => {
  const { userId, accessToken } = req.session;
  const { name } = req.params;

  try {
    const items = await PeopleService.getPersonItemsByName(userId, accessToken, name);
    return res.json(items);
  } catch (error) {
    console.error(`[Media Person Items By Name Error] ${name}:`, error.message);
    return res.status(500).json({ error: 'Failed to fetch person items' });
  }
}));

export default router;
