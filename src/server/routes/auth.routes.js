import express from 'express';
import { AuthService } from '../services/jellyfin/auth.service.js';
import { UserBanService } from '../services/user-ban.service.js';
import { KnownUsersService } from '../services/known-users.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createDeviceId, forgetTokenDevice, registerTokenDevice } from '../services/jellyfin/client.js';
import { destroyInvalidSession, endBannedSession, isUpstreamUnauthorized, requireAuth } from '../middleware/auth.middleware.js';
import { loginThrottle, formatLockDuration } from '../services/login-throttle.service.js';

const router = express.Router();

// "Angemeldet bleiben": the cookie outlives the browser session for two
// weeks; without it the session cookie has no maxAge at all.
export const REMEMBER_ME_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const BAN_MESSAGE = 'Login fehlgeschlagen: Dein Benutzerkonto ist gesperrt.';
const WRONG_CREDENTIALS = 'Benutzername oder Passwort ist falsch.';
const JELLYFIN_UNREACHABLE = 'Der Jellyfin-Server ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.';

const tooManyAttempts = (res, waitMs) => {
  res.setHeader('Retry-After', String(Math.ceil(waitMs / 1000)));
  return res.status(429).json({
    error: `Zu viele Fehlversuche. Bitte warte ${formatLockDuration(waitMs)}.`,
    code: 'LOGIN_LOCKED',
    retryAfterMs: waitMs
  });
};

// A fresh session id for every login, so an id someone planted or saw before
// is worthless afterwards. Test doubles without regenerate keep theirs.
const regenerateSession = (req) => new Promise((resolve, reject) => {
  if (typeof req.session?.regenerate !== 'function') return resolve();
  req.session.regenerate(error => (error ? reject(error) : resolve()));
});

// Jellyfin answers wrong credentials (and its own lockout) with a 4xx; no
// status or a 5xx means it could not be asked, which is nobody's failed try.
const isCredentialFailure = (error) => error?.status >= 400 && error?.status < 500;

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password, rememberMe } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const waitMs = loginThrottle.check(ip, username);
  if (waitMs > 0) return tooManyAttempts(res, waitMs);

  const deviceId = createDeviceId();
  let data;
  try {
    data = await AuthService.login(username, password || '', { deviceId });
  } catch (error) {
    if (!isCredentialFailure(error)) {
      console.error('[Login Error] Jellyfin not reachable:', error.message);
      return res.status(503).json({ error: JELLYFIN_UNREACHABLE });
    }
    console.warn(`[Login] failed attempt for "${String(username).slice(0, 64)}" from ${ip}`);
    const lockMs = loginThrottle.recordFailure(ip, username);
    if (lockMs > 0) return tooManyAttempts(res, lockMs);
    return res.status(401).json({ error: WRONG_CREDENTIALS });
  }

  loginThrottle.recordSuccess(ip, username);

  const ban = UserBanService.getBan(data.User.Id);
  if (ban) {
    AuthService.logout(data.AccessToken).catch(() => {});
    return res.status(403).json({ error: BAN_MESSAGE, reason: ban.reason, code: 'BANNED' });
  }

  const isAdmin = AuthService.isAdministrator(data.User);

  await regenerateSession(req);
  req.session.accessToken = data.AccessToken;
  req.session.deviceId = deviceId;
  registerTokenDevice(data.AccessToken, deviceId);
  req.session.userId = data.User.Id;
  req.session.username = data.User.Name;
  req.session.isAdmin = isAdmin;
  if (rememberMe === true) {
    req.session.cookie.maxAge = REMEMBER_ME_MAX_AGE_MS;
  }

  KnownUsersService.remember({ userId: data.User.Id, username: data.User.Name });

  return res.json({
    user: {
      id: data.User.Id,
      name: data.User.Name,
      isAdmin
    }
  });
}));

router.get('/me', asyncHandler(async (req, res) => {
  if (req.session && req.session.accessToken && req.session.userId) {
    const ban = UserBanService.getBan(req.session.userId);
    if (ban) {
      return endBannedSession(req, res, ban);
    }

    try {
      const user = await AuthService.getCurrentUser(req.session.userId, req.session.accessToken);
      const isAdmin = AuthService.isAdministrator(user);
      req.session.isAdmin = isAdmin;

      KnownUsersService.remember({ userId: req.session.userId, username: user.Name || req.session.username });

      return res.json({
        user: {
          id: req.session.userId,
          name: user.Name || req.session.username,
          isAdmin
        }
      });
    } catch (error) {
      if (isUpstreamUnauthorized(error)) {
        return destroyInvalidSession(req, res);
      }

      console.warn('[Auth Me Admin Check Error]', error.message);
      return res.status(503).json({ error: 'Could not verify Jellyfin session' });
    }
  }
  return res.status(401).json({ error: 'Not authenticated' });
}));

router.post('/password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword = '', newPassword } = req.body;
  const { userId, accessToken } = req.session;

  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'New password is required' });
  }

  try {
    await AuthService.changePassword(userId, accessToken, currentPassword || '', newPassword);
    return res.json({ success: true });
  } catch (error) {
    console.error('[Change Password Error]', error.message);
    const status = error.status === 400 || error.status === 401 || error.status === 403 ? 403 : 500;
    return res.status(status).json({
      error: status === 403 ? 'Current password is invalid' : 'Failed to change password'
    });
  }
}));

router.post('/logout', (req, res) => {
  const token = req.session?.accessToken;
  // Revoke the token at Jellyfin too (still under its own device id);
  // logging out must not wait for it.
  if (token) {
    AuthService.logout(token).catch(error => console.warn('[Logout] Jellyfin session not ended:', error.message));
  }
  forgetTokenDevice(token);
  req.session.destroy((err) => {
    if (err) {
      console.error('[Logout Error]', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

export default router;
