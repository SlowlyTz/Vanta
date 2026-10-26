// Wraps a route that reads from Jellyfin: a rejected token ends the session (401),
// a missing item is a 404, a timeout a 504, anything else is logged and a 500.
import { asyncHandler } from './asyncHandler.js';
import { destroyInvalidSession, isUpstreamUnauthorized } from '../middleware/auth.middleware.js';

export const NOT_FOUND_MESSAGE = 'Titel nicht gefunden';

// Jellyfin answers an unknown (or not shared) item with 404 and a malformed
// item id with 400; for a route about one item both mean "not found".
const isNotFound = (error, req) =>
  error?.status === 404 || (error?.status === 400 && Boolean(req.params?.id));

// Failures are logged under `label`. `passThrough` statuses answer with the
// error's own message (a validation 400); `fallback(req, res, error)` replaces the 500.
export function jellyfinRoute(label, failureMessage, handler, { notFoundMessage = NOT_FOUND_MESSAGE, passThrough = [], fallback = null } = {}) {
  return asyncHandler(async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (error) {
      console.error(`[${label}]`, error.message);
      if (res.headersSent) {
        if (isUpstreamUnauthorized(error)) req.session?.destroy?.(() => {});
        return undefined;
      }
      if (isUpstreamUnauthorized(error)) return destroyInvalidSession(req, res);
      if (passThrough.includes(error?.status)) return res.status(error.status).json({ error: error.message });
      if (isNotFound(error, req)) return res.status(404).json({ error: notFoundMessage });
      if (error?.status === 504) return res.status(504).json({ error: failureMessage });
      if (fallback) return fallback(req, res, error);
      return res.status(500).json({ error: failureMessage });
    }
  });
}
