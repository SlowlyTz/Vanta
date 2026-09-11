import express from 'express';
import env from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCatalog } from '../services/catalog/index.js';

const router = express.Router();

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// Local tooling (`npm run refresh`) talks to the running server through here.
// Two checks instead of a session: the call must come from this machine and
// carry the server's own Jellyfin key, which only the same .env can supply.
const requireLocalKey = (req, res, next) => {
  const address = req.socket?.remoteAddress || '';
  if (!LOOPBACK.has(address)) return res.status(403).json({ error: 'Nur lokal erreichbar' });
  if (req.get('x-vanta-key') !== env.JELLYFIN_API_KEY) return res.status(401).json({ error: 'Ungültiger Schlüssel' });
  next();
};

router.use(requireLocalKey);

// Unlike the admin trigger this waits for the run, so the command can print
// what happened.
router.post('/catalog/refresh', asyncHandler(async (req, res) => {
  const { sync } = await getCatalog();
  const full = req.body?.full === true;
  const record = full ? await sync.runFull() : await sync.runUpdate();
  res.status(record.error ? 502 : 200).json(record);
}));

export default router;
