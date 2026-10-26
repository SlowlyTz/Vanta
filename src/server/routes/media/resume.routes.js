import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { jellyfinRoute } from '../../utils/jellyfinRoute.js';
import { isValidId, validateIdParam } from '../../utils/ids.js';
import { ResumeService } from '../../services/resume.service.js';
import { UserDataService } from '../../services/user-data.service.js';

// An undo names the series or film it puts back; both must be item ids.
const isValidUndo = (undo) => [undo?.seriesId, undo?.itemId].every(id => id === undefined || id === null || isValidId(String(id)));

// For the media context menu: the episode "Weiterschauen" starts for a
// series, and taking a title out of "Weiter schauen" (with undo). Both
// change what the cards show, so the progress cache starts over.
export function createResumeRouter({ service = ResumeService, userData = UserDataService } = {}) {
  const router = express.Router();
  router.param('id', validateIdParam);

  router.get('/item/:id/next-up', requireAuth, jellyfinRoute('Next Up Error', 'Nächste Folge konnte nicht ermittelt werden', async (req, res) => {
    res.json({ episode: await service.nextUp(req.session.userId, req.session.accessToken, req.params.id) });
  }));

  router.delete('/resume/:id', requireAuth, jellyfinRoute('Resume Remove Error', 'Konnte nicht aus „Weiter schauen“ entfernt werden', async (req, res) => {
    const undo = await service.remove(req.session.userId, req.session.accessToken, req.params.id);
    userData.forget(req.session.userId);
    res.json({ undo });
  }));

  router.post('/resume/restore', requireAuth, jellyfinRoute('Resume Restore Error', 'Konnte nicht rückgängig gemacht werden', async (req, res) => {
    if (!isValidUndo(req.body?.undo)) return res.status(400).json({ error: 'Ungültige ID' });
    try {
      await service.restore(req.session.userId, req.session.accessToken, req.body?.undo);
      userData.forget(req.session.userId);
      return res.json({ restored: true });
    } catch (error) {
      if (error.status === 400) return res.status(400).json({ error: error.message });
      throw error;
    }
  }));

  return router;
}

export default createResumeRouter();
