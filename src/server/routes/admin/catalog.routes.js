// Admin control of the catalogue sync: status, schedule and manual runs.
import express from 'express';
import { requireAuth, requireFreshAdmin } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getCatalog } from '../../services/catalog/index.js';

const router = express.Router();

router.use(requireAuth, requireFreshAdmin);

const buildStatus = ({ sync, scheduler }) => ({
  ...sync.getStatus(),
  plan: scheduler.getPlan()
});

router.get('/', asyncHandler(async (req, res) => {
  res.json(buildStatus(await getCatalog()));
}));

router.put('/settings', asyncHandler(async (req, res) => {
  const catalog = await getCatalog();
  const { updateIntervalMinutes, fullSyncTime } = req.body || {};

  const result = catalog.settings.update({ updateIntervalMinutes, fullSyncTime });
  if (result.error) return res.status(400).json({ error: result.error });

  catalog.scheduler.reload();
  res.json(buildStatus(catalog));
}));

// Both triggers answer immediately; the run itself continues in the background
// and the client polls the status for its outcome.
router.post('/sync/update', asyncHandler(async (req, res) => {
  const catalog = await getCatalog();
  const alreadyRunning = catalog.sync.isRunning();
  catalog.sync.runUpdate();
  res.status(202).json({ started: !alreadyRunning, ...buildStatus(catalog) });
}));

// While an update runs the full run waits for it (tried again every ten
// minutes, see scheduler.js); `queued` says so.
router.post('/sync/full', asyncHandler(async (req, res) => {
  const catalog = await getCatalog();
  const alreadyRunning = catalog.sync.isRunning();
  const queued = catalog.sync.runningType?.() === 'update' || catalog.scheduler.getPlan().fullRetryPending === true;
  catalog.scheduler.requestFull();
  res.status(202).json({ started: !alreadyRunning && !queued, queued, ...buildStatus(catalog) });
}));

export default router;
