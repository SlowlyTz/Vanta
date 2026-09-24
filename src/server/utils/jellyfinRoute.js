import { asyncHandler } from './asyncHandler.js';
import { destroyInvalidSession, isUpstreamUnauthorized } from '../middleware/auth.middleware.js';

// A route that reads from Jellyfin: a rejected token ends the session (401),
// any other failure is logged under `label` and answered with a 500.
export function jellyfinRoute(label, failureMessage, handler) {
  return asyncHandler(async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (error) {
      console.error(`[${label}]`, error.message);
      if (isUpstreamUnauthorized(error)) return destroyInvalidSession(req, res);
      if (res.headersSent) return undefined;
      return res.status(500).json({ error: failureMessage });
    }
  });
}
