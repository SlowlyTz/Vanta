import { asyncHandler } from './asyncHandler.js';
import { destroyInvalidSession, isUpstreamUnauthorized } from '../middleware/auth.middleware.js';

export const NOT_FOUND_MESSAGE = 'Titel nicht gefunden';

// Jellyfin answers an unknown (or not shared) item with 404 and a malformed
// item id with 400; for a route about one item both mean "not found".
const isNotFound = (error, req) =>
  error?.status === 404 || (error?.status === 400 && Boolean(req.params?.id));

// A route that reads from Jellyfin: a rejected token ends the session (401),
// a missing item is a 404, a Jellyfin that did not answer in time a 504, and
// any other failure is logged under `label` and answered with a 500.
export function jellyfinRoute(label, failureMessage, handler) {
  return asyncHandler(async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (error) {
      console.error(`[${label}]`, error.message);
      if (isUpstreamUnauthorized(error)) return destroyInvalidSession(req, res);
      if (res.headersSent) return undefined;
      if (isNotFound(error, req)) return res.status(404).json({ error: NOT_FOUND_MESSAGE });
      if (error?.status === 504) return res.status(504).json({ error: failureMessage });
      return res.status(500).json({ error: failureMessage });
    }
  });
}
