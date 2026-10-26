// Jellyfin item id validation (32 hex digits, older servers with dashes);
// anything else never reaches a Jellyfin URL.
export const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

export const isValidId = (id) => typeof id === 'string' && ID_PATTERN.test(id);

// Route guard for an `:id` parameter.
export const requireValidId = (req, res, next) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Ungültige ID' });
  return next();
};

// The same check as `router.param('id', validateIdParam)`, for every route of a router.
export const validateIdParam = (req, res, next, id) => {
  if (!isValidId(id)) return res.status(400).json({ error: 'Ungültige ID' });
  return next();
};
