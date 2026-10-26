// Person pages: details and titles, by Jellyfin id or by name.
import express from 'express';
import { PeopleService } from '../../services/jellyfin/people.service.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { jellyfinRoute } from '../../utils/jellyfinRoute.js';
import { validateIdParam } from '../../utils/ids.js';

const router = express.Router();

router.param('id', validateIdParam);

const PERSON_NOT_FOUND = { notFoundMessage: 'Person nicht gefunden' };

router.get('/:id', requireAuth, jellyfinRoute('Media Person Error', 'Person konnte nicht geladen werden', async (req, res) => {
  res.json(await PeopleService.getPersonDetails(req.session.userId, req.session.accessToken, req.params.id));
}, PERSON_NOT_FOUND));

router.get('/:id/items', requireAuth, jellyfinRoute('Media Person Items Error', 'Titel der Person konnten nicht geladen werden', async (req, res) => {
  res.json(await PeopleService.getPersonItems(req.session.userId, req.session.accessToken, req.params.id));
}, PERSON_NOT_FOUND));

router.get('/by-name/:name', requireAuth, jellyfinRoute('Media Person By Name Error', 'Person konnte nicht geladen werden', async (req, res) => {
  res.json(await PeopleService.getPersonDetailsByName(req.session.userId, req.session.accessToken, req.params.name));
}, PERSON_NOT_FOUND));

router.get('/by-name/:name/items', requireAuth, jellyfinRoute('Media Person Items By Name Error', 'Titel der Person konnten nicht geladen werden', async (req, res) => {
  res.json(await PeopleService.getPersonItemsByName(req.session.userId, req.session.accessToken, req.params.name));
}, PERSON_NOT_FOUND));

export default router;
