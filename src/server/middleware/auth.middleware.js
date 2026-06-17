import { AuthService } from '../services/jellyfin/auth.service.js';

export const isUpstreamUnauthorized = (error) => error?.status === 401;

export const destroyInvalidSession = (req, res, message = 'Session expired. Please log in again.') => {
  if (!req.session) {
    return res.status(401).json({ error: message });
  }

  return req.session.destroy((err) => {
    if (err) {
      console.error('[Session Destroy Error]', err);
    }
    res.clearCookie('connect.sid');
    return res.status(401).json({ error: message });
  });
};

export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.accessToken || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid or expired' });
  }
  next();
};

export const requireFreshAdmin = async (req, res, next) => {
  try {
    const isAdmin = await AuthService.isUserAdmin(req.session.userId, req.session.accessToken);
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
