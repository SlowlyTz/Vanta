import express from 'express';
import { requireAuth, requireFreshAdmin } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AdminDashboard } from '../../services/admin-dashboard.service.js';
import { NotifyService } from '../../services/notify.service.js';
import { UserDirectory } from '../../services/user-directory.service.js';

const TITLE_MAX = 80;
const BODY_MAX = 300;

// The admin dashboard (#/admin) and the message to everyone.
export function createDashboardRouter({ dashboard = AdminDashboard, notify = NotifyService, directory = UserDirectory } = {}) {
  const router = express.Router();
  router.use(requireAuth, requireFreshAdmin);

  router.get('/', asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await dashboard.read());
  }));

  // "Push an alle senden": a message to every user, in the list and as push
  // where they allow "Mitteilungen".
  router.post('/announce', asyncHandler(async (req, res) => {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    if (!title || !body) return res.status(400).json({ error: 'Titel und Text sind nötig' });
    if (title.length > TITLE_MAX || body.length > BODY_MAX) {
      return res.status(400).json({ error: `Höchstens ${TITLE_MAX} Zeichen Titel und ${BODY_MAX} Zeichen Text` });
    }
    const users = await directory.all();
    const results = await notify.notify({ userIds: users.map(user => user.id), kind: 'announcement', title, body, url: '/#/home' });
    return res.json({
      recipients: results.length,
      pushed: results.reduce((sum, result) => sum + (result.pushed || 0), 0)
    });
  }));

  return router;
}

export default createDashboardRouter();
