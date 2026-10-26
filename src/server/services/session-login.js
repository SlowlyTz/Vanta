// Turns a Jellyfin sign-in into a VANTA session: fresh session id, token
// device, "Angemeldet bleiben" and the hand-over of the push subscription.
import { AuthService } from './jellyfin/auth.service.js';
import { forgetTokenDevice, registerTokenDevice } from './jellyfin/client.js';
import { KnownUsersService } from './known-users.service.js';
import { publicSessionId } from '../db/session-store.js';

// "Angemeldet bleiben": the cookie outlives the browser session for two
// weeks; without it the session cookie has no maxAge at all.
export const REMEMBER_ME_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// A fresh session id for every login, so an id someone planted or saw before
// is worthless afterwards. Test doubles without regenerate keep theirs.
export const regenerateSession = (req) => new Promise((resolve, reject) => {
  if (typeof req.session?.regenerate !== 'function') return resolve();
  req.session.regenerate(error => (error ? reject(error) : resolve()));
});

// The push subscription of the session a login replaces: another account
// on this device gets none of the old account's pushes; the same account
// keeps it, now bound to the new session.
async function handOverPush(previous, req, loadPush) {
  if (!previous.pushEndpoint || !previous.userId) return;
  try {
    const push = await loadPush();
    if (previous.userId !== req.session.userId) {
      push.unsubscribe(previous.userId, previous.pushEndpoint);
      return;
    }
    if (push.rebind(previous.userId, previous.pushEndpoint, publicSessionId(req.sessionID))) {
      req.session.pushEndpoint = previous.pushEndpoint;
    }
  } catch (error) {
    console.warn('[Login] push subscription not handed over:', error.message);
  }
}

// For password and Quick Connect sign-ins alike. Answers what the client
// learns about the user.
export async function startUserSession(req, data, deviceId, {
  rememberMe = false,
  // Loaded on demand: the push service brings the database with it.
  loadPush = () => import('./push.service.js').then(module => module.PushService)
} = {}) {
  const isAdmin = AuthService.isAdministrator(data.User);
  const previous = { userId: req.session?.userId, pushEndpoint: req.session?.pushEndpoint, accessToken: req.session?.accessToken };
  await regenerateSession(req);
  // A login over an older one in this browser ends that one at Jellyfin too.
  if (previous.accessToken && previous.accessToken !== data.AccessToken) {
    AuthService.logout(previous.accessToken)
      .catch(error => console.warn('[Login] previous Jellyfin session not ended:', error.message))
      .finally(() => forgetTokenDevice(previous.accessToken));
  }
  req.session.accessToken = data.AccessToken;
  req.session.deviceId = deviceId;
  registerTokenDevice(data.AccessToken, deviceId);
  req.session.userId = data.User.Id;
  req.session.username = data.User.Name;
  req.session.isAdmin = isAdmin;
  // Shown under "Geräte" in the settings.
  req.session.device = { userAgent: String(req.get?.('user-agent') || '').slice(0, 300), loginAt: Date.now() };
  if (rememberMe === true) {
    req.session.cookie.maxAge = REMEMBER_ME_MAX_AGE_MS;
  }
  KnownUsersService.remember({ userId: data.User.Id, username: data.User.Name });
  await handOverPush(previous, req, loadPush);
  return { id: data.User.Id, name: data.User.Name, isAdmin };
}
