// What a Jellyfin item id looks like (32 hex digits, older servers with
// dashes). Anything else never reaches a Jellyfin URL.
export const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

export const isValidId = (id) => typeof id === 'string' && ID_PATTERN.test(id);

// Route guard for an `:id` parameter.
export const requireValidId = (req, res, next) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Ungültige ID' });
  return next();
};
