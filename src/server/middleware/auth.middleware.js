import { registerTokenDevice } from '../services/jellyfin/client.js';
import { AuthService } from '../services/jellyfin/auth.service.js';
import { UserBanService, bannedPayload } from '../services/user-ban.service.js';

export const isUpstreamUnauthorized = (error) => error?.status === 401;

export const destroyInvalidSession = (req, res, message = 'Session expired. Please log in again.', extra = {}) => {
  const body = { error: message, ...extra };
  if (!req.session) {
    return res.status(401).json(body);
  }

  return req.session.destroy((err) => {
    if (err) {
      console.error('[Session Destroy Error]', err);
    }
    res.clearCookie('connect.sid');
    return res.status(401).json(body);
  });
};

// The ban answer: the session ends here, and the client takes the user to
// the login with the message and reason.
export const endBannedSession = (req, res, ban) => {
  const { error, ...extra } = bannedPayload(ban);
  return destroyInvalidSession(req, res, error, extra);
};

export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.accessToken || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid or expired' });
  }
  const ban = UserBanService.getBan(req.session.userId);
  if (ban) return endBannedSession(req, res, ban);
  // After a restart the token's device is known again from the session.
  registerTokenDevice(req.session.accessToken, req.session.deviceId);
  next();
};

// The admin flag comes from Jellyfin, asked again for each admin request; an
// admin screen fires several at once, so one answer serves a user for a short
// while. A demotion in Jellyfin takes effect within that time.
export const ADMIN_CHECK_TTL_MS = 30 * 1000;
const adminChecks = new Map(); // userId -> { token, isAdmin, at }

const isAdminCached = async (userId, token, now = Date.now()) => {
  const cached = adminChecks.get(userId);
  if (cached && cached.token === token && now - cached.at < ADMIN_CHECK_TTL_MS) return cached.isAdmin;
  const isAdmin = await AuthService.isUserAdmin(userId, token);
  adminChecks.set(userId, { token, isAdmin, at: now });
  return isAdmin;
};

export const clearAdminCheckCache = () => adminChecks.clear();

export const requireFreshAdmin = async (req, res, next) => {
  try {
    const isAdmin = await isAdminCached(req.session.userId, req.session.accessToken);
    req.session.isAdmin = isAdmin;

    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.warn('[Admin Check Error]', error.message);
    req.session.isAdmin = false;
    return res.status(403).json({ error: 'Admin access required' });
  }
};
