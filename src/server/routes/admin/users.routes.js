import express from 'express';
import { requireAuth, requireFreshAdmin } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { JellyfinAdminUsersService } from '../../services/jellyfin/admin-users.service.js';
import { UserBanService } from '../../services/user-ban.service.js';
import { revokeUserAccess, accountDeletedPayload } from '../../services/session-revocation.service.js';
import { UserSettingsService } from '../../services/user-settings.service.js';
import { streamSessionService } from '../../services/stream-session.service.js';
import { getActiveCatalogReader } from '../../services/catalog/reader.js';
import { clearVisibilityCache } from '../../services/catalog/visibility.js';
import { UserDirectory } from '../../services/user-directory.service.js';
import { getImageAccess } from '../../services/images/image-access.js';

// The FSK ages an account can be limited to (Jellyfin's rating score for an
// FSK rating is the age); null is no limit.
export const AGE_LIMITS = [0, 6, 12, 16, 18];
// "Titel ohne Altersfreigabe sperren" covers what VANTA shows.
const UNRATED_KINDS = ['Movie', 'Series'];

const router = express.Router();

router.use(requireAuth, requireFreshAdmin);

function normalizeUser(jellyfinUser) {
  const ban = UserBanService.getBan(jellyfinUser.Id);
  const policy = jellyfinUser.Policy || {};

  return {
    id: jellyfinUser.Id,
    name: jellyfinUser.Name,
    isAdmin: Boolean(policy.IsAdministrator),
    isDisabled: Boolean(policy.IsDisabled),
    isBanned: ban !== null,
    banReason: ban?.reason || null,
    maxConcurrentStreams: UserSettingsService.getMaxConcurrentStreams(jellyfinUser.Id),
    activeStreams: streamSessionService.getActiveCount(jellyfinUser.Id),
    enableAllFolders: Boolean(policy.EnableAllFolders),
    enabledFolders: Array.isArray(policy.EnabledFolders) ? policy.EnabledFolders : [],
    ...ageLimitOfPolicy(policy)
  };
}

function ageLimitOfPolicy(policy) {
  const blocked = Array.isArray(policy.BlockUnratedItems) ? policy.BlockUnratedItems : [];
  return {
    maxAge: Number.isFinite(policy.MaxParentalRating) ? policy.MaxParentalRating : null,
    blockUnrated: UNRATED_KINDS.some(kind => blocked.includes(kind))
  };
}

function isSelf(req, userId) {
  return req.session.userId === userId;
}

function respondWithJellyfinError(res, error, fallbackMessage) {
  console.error('[Admin Users]', error.message);
  const status = Number.isInteger(error.status) ? error.status : 502;
  return res.status(status).json({ error: fallbackMessage });
}

router.get('/', asyncHandler(async (req, res) => {
  const users = await JellyfinAdminUsersService.listUsers(req.session.accessToken);
  res.json({ users: users.map(normalizeUser) });
}));

// Every library with its kind, how many titles it holds and a few posters:
// movies and series from the catalogue, anything else counted by Jellyfin.
router.get('/libraries', asyncHandler(async (req, res) => {
  const libraries = await JellyfinAdminUsersService.listLibraries(req.session.accessToken);
  const stats = getActiveCatalogReader()?.libraryStats() || {};
  const counted = await Promise.all(libraries.map(async lib => {
    if (stats[lib.ItemId]) return stats[lib.ItemId];
    const count = await JellyfinAdminUsersService.countLibraryItems(lib.ItemId, req.session.accessToken).catch(() => null);
    return { count, previews: [] };
  }));
  res.json({
    libraries: libraries.map((lib, index) => ({
      id: lib.ItemId,
      name: lib.Name,
      collectionType: lib.CollectionType || null,
      itemCount: counted[index].count,
      previews: counted[index].previews
    }))
  });
}));

router.patch('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name ist erforderlich' });
  }

  try {
    const user = await JellyfinAdminUsersService.updateUserName(userId, req.session.accessToken, name);
    return res.json({ id: user.Id, name: user.Name });
  } catch (error) {
    return respondWithJellyfinError(res, error, 'Nutzer konnte nicht umbenannt werden');
  }
}));

router.post('/:userId/password', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Neues Passwort ist erforderlich' });
  }

  try {
    await JellyfinAdminUsersService.setPassword(userId, req.session.accessToken, newPassword);
    return res.json({ success: true });
  } catch (error) {
    return respondWithJellyfinError(res, error, 'Passwort konnte nicht geändert werden');
  }
}));

router.delete('/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (isSelf(req, userId)) {
    return res.status(400).json({ error: 'Du kannst dein eigenes Konto nicht löschen' });
  }

  try {
    await JellyfinAdminUsersService.deleteUser(userId, req.session.accessToken);
    UserBanService.unban(userId);
    // Out at once on every device, with the reason on the login page.
    await revokeUserAccess(userId, null, { payload: accountDeletedPayload() });
    return res.json({ success: true });
  } catch (error) {
    return respondWithJellyfinError(res, error, 'Nutzer konnte nicht gelöscht werden');
  }
}));

router.post('/:userId/ban', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason, username } = req.body;

  if (isSelf(req, userId)) {
    return res.status(400).json({ error: 'Du kannst dich nicht selbst sperren' });
  }

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return res.status(400).json({ error: 'Ein Sperrgrund ist erforderlich' });
  }

  const entry = UserBanService.ban(userId, username || null, reason, {
    userId: req.session.userId,
    username: req.session.username
  });

  // Out at once, not only at the next login: sessions, tokens and sockets.
  await revokeUserAccess(userId, entry);

  return res.json({ ban: entry });
}));

router.delete('/:userId/ban', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const wasBanned = UserBanService.unban(userId);
  return res.json({ success: true, wasBanned });
}));

router.patch('/:userId/libraries', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { enableAllFolders, enabledFolders } = req.body;

  if (typeof enableAllFolders !== 'boolean') {
    return res.status(400).json({ error: 'enableAllFolders muss ein Boolean sein' });
  }

  if (!enableAllFolders && !Array.isArray(enabledFolders)) {
    return res.status(400).json({ error: 'enabledFolders muss ein Array sein, wenn enableAllFolders false ist' });
  }

  try {
    const policy = await JellyfinAdminUsersService.updatePolicy(userId, req.session.accessToken, {
      EnableAllFolders: enableAllFolders,
      EnabledFolders: enableAllFolders ? [] : enabledFolders.map(String)
    });

    return res.json({
      enableAllFolders: Boolean(policy.EnableAllFolders),
      enabledFolders: Array.isArray(policy.EnabledFolders) ? policy.EnabledFolders : []
    });
  } catch (error) {
    return respondWithJellyfinError(res, error, 'Bibliothekszugriff konnte nicht aktualisiert werden');
  }
}));

// Jellyfin's parental control for one account: the highest FSK age and
// whether unrated films and series are blocked. Jellyfin keeps it, so it
// holds for every Jellyfin app as well; VANTA's own caches of the account's
// access are dropped so the change shows at once.
router.patch('/:userId/age-limit', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { maxAge, blockUnrated } = req.body || {};

  if (maxAge !== null && !AGE_LIMITS.includes(maxAge)) {
    return res.status(400).json({ error: 'Altersfreigabe muss leer oder FSK 0, 6, 12, 16 oder 18 sein' });
  }
  if (typeof blockUnrated !== 'boolean') {
    return res.status(400).json({ error: '„Ohne Altersfreigabe sperren“ muss an oder aus sein' });
  }

  try {
    const current = await JellyfinAdminUsersService.getUser(userId, req.session.accessToken);
    const otherKinds = (current?.Policy?.BlockUnratedItems || []).filter(kind => !UNRATED_KINDS.includes(kind));
    const policy = await JellyfinAdminUsersService.updatePolicy(userId, req.session.accessToken, {
      MaxParentalRating: maxAge,
      MaxParentalSubRating: null,
      BlockUnratedItems: blockUnrated ? [...otherKinds, ...UNRATED_KINDS] : otherKinds
    });
    clearVisibilityCache(userId);
    UserDirectory.invalidate();
    getImageAccess().clear();
    return res.json(ageLimitOfPolicy(policy));
  } catch (error) {
    return respondWithJellyfinError(res, error, 'Altersfreigabe konnte nicht gespeichert werden');
  }
}));

router.patch('/:userId/stream-limit', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { maxConcurrentStreams } = req.body;

  try {
    const entry = UserSettingsService.setMaxConcurrentStreams(userId, maxConcurrentStreams, {
      userId: req.session.userId,
      username: req.session.username
    });
    return res.json(entry);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
}));

export default router;
