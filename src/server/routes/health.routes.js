// Liveness and readiness for monitoring (and a quick look after a deploy).
// Open without a session like /api/version; it names no users or data. The
// Jellyfin ping is shared for a few seconds so polling cannot flood Jellyfin.
import express from 'express';
import { getActiveCatalogReader } from '../services/catalog/reader.js';
import { jellyfinRawFetch } from '../services/jellyfin/client.js';
import { APP_VERSION } from '../../public/js/shared/version.js';

const JELLYFIN_CHECK_TTL_MS = 10 * 1000;

export function createHealthRouter({
  ping = () => jellyfinRawFetch('/System/Ping', { timeoutMs: 3000 }),
  getReader = getActiveCatalogReader,
  now = () => Date.now(),
  startedAt = Date.now()
} = {}) {
  const router = express.Router();
  let lastCheck = null; // { at, promise }

  const checkJellyfin = () => {
    if (lastCheck && now() - lastCheck.at < JELLYFIN_CHECK_TTL_MS) return lastCheck.promise;
    const begun = now();
    const promise = ping()
      .then(response => ({ ok: Boolean(response?.ok), latencyMs: now() - begun }))
      .catch(() => ({ ok: false, latencyMs: null }));
    lastCheck = { at: begun, promise };
    return promise;
  };

  router.get('/', async (req, res) => {
    const jellyfin = await checkJellyfin();
    const catalogReady = Boolean(getReader());
    res.setHeader('Cache-Control', 'no-store');
    res.status(jellyfin.ok ? 200 : 503).json({
      status: jellyfin.ok ? 'ok' : 'degraded',
      version: APP_VERSION,
      uptimeSeconds: Math.round((now() - startedAt) / 1000),
      checks: {
        jellyfin,
        catalog: { ready: catalogReady }
      }
    });
  });

  return router;
}

export default createHealthRouter();
