export const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.accessToken || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized: Session invalid or expired' });
  }
  next();
};
