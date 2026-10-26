// Problem reports on library titles: filed by users, resolved or dismissed by admins.
import express from 'express';
import { requireAuth, requireFreshAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ReportsService } from '../services/reports.service.js';
import { sendReportCreated } from '../services/discord-webhook.service.js';
import { notifyNotificationsChanged } from '../realtime/app.socket.js';
import { NotificationTriggers } from '../services/notification-triggers.js';

const router = express.Router();

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { userId, username, accessToken } = req.session;
  const { itemId, scope, seasonNumber, episodeNumber, problem, message } = req.body || {};
  try {
    const report = await ReportsService.create(
      { userId, username, token: accessToken },
      { itemId, scope, seasonNumber, episodeNumber, problem, message }
    );
    res.status(201).json(report);
    notifyNotificationsChanged();
    sendReportCreated(report).catch(error => console.error('[Discord Webhook] trigger failed:', error.message));
    NotificationTriggers.adminWork({ kind: 'report', username, title: report.title, url: '/#/admin/requests' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }
}));

// The user's own reports, newest first.
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  res.json(ReportsService.getByUser(req.session.userId));
}));

router.get('/admin/open', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  res.json(ReportsService.getOpen());
}));

router.get('/admin/all', requireAuth, requireFreshAdmin, asyncHandler(async (req, res) => {
  res.json(ReportsService.getAll());
}));

const setStatus = status => asyncHandler(async (req, res) => {
  try {
    const { report, changed } = ReportsService.decide(Number(req.params.id), status, req.session.username);
    res.json(report);
    // Only a real change tells the reporter.
    if (!changed) return undefined;
    notifyNotificationsChanged();
    NotificationTriggers.reportHandled(report);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }
});

router.post('/:id/resolve', requireAuth, requireFreshAdmin, setStatus('resolved'));
router.post('/:id/dismiss', requireAuth, requireFreshAdmin, setStatus('dismissed'));

export default router;
