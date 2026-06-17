import { JellyfinService } from '../services/jellyfin.service.js';

export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.accessToken || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid or expired' });
  }
  next();
};

export const requireFreshAdmin = async (req, res, next) => {
  try {
    const isAdmin = await JellyfinService.isUserAdmin(req.session.userId, req.session.accessToken);
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
