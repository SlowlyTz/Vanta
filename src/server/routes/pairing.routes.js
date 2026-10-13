import express from 'express';
import QRCode from 'qrcode';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { jellyfinRoute } from '../utils/jellyfinRoute.js';
import { PairingService } from '../services/pairing.service.js';
import { UserBanService } from '../services/user-ban.service.js';
import { AuthService } from '../services/jellyfin/auth.service.js';
import { createLoginThrottle, formatLockDuration } from '../services/login-throttle.service.js';
import { startUserSession } from '../services/session-login.js';

const BAN_MESSAGE = 'Login fehlgeschlagen: Dein Benutzerkonto ist gesperrt.';
// Wrong codes are braked like wrong passwords, but on a throttle of their
// own: guessing codes never locks the password login of an address, and
// the other way round.
const THROTTLE_NAME = '#tv-pairing';
export const pairingThrottle = createLoginThrottle();

const ipOf = req => req.ip || req.socket?.remoteAddress || 'unknown';

// "Mit dem Handy anmelden" (TV) and "Fernseher verbinden" (phone).
// The page a phone opens from the QR code on the TV.
export const connectUrl = (req, code) => `${req.protocol}://${req.get('host')}/#/connect?code=${encodeURIComponent(code)}`;

export function createPairingRouter({ pairing = PairingService, bans = UserBanService, auth = AuthService, throttle = pairingThrottle, qr = text => QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }) } = {}) {
  const router = express.Router();

  const locked = (req, res) => {
    const waitMs = throttle.check(ipOf(req), THROTTLE_NAME);
    if (waitMs <= 0) return false;
    res.setHeader('Retry-After', String(Math.ceil(waitMs / 1000)));
    res.status(429).json({ error: `Zu viele falsche Codes. Bitte warte ${formatLockDuration(waitMs)}.` });
    return true;
  };

  // The TV asks for a code. The session (cookie) of the TV holds the
  // pairing, so only this TV can sign in with it.
  router.post('/', jellyfinRoute('Pairing Start Error', 'Der Code konnte nicht erstellt werden.', async (req, res) => {
    try {
      const started = await pairing.start({ ip: ipOf(req), userAgent: req.get('user-agent') });
      req.session.pairingToken = started.token;
      const url = connectUrl(req, started.code);
      const qrSvg = await qr(url).catch(() => null);
      res.status(201).json({ code: started.code, expiresAt: started.expiresAt, url, qrSvg });
    } catch (error) {
      if (error.expose) return res.status(error.status).json({ error: error.message, code: error.code });
      throw error;
    }
  }));

  // The TV asks every couple of seconds; once the phone confirmed, it signs in.
  router.get('/status', jellyfinRoute('Pairing Login Error', 'Anmeldung fehlgeschlagen.', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = req.session?.pairingToken;
    const { state } = pairing.status(token);
    if (state !== 'confirmed') return res.json({ state });

    let signedIn;
    try {
      signedIn = await pairing.finish(token);
    } catch (error) {
      // Another poll of this TV is signing in right now.
      if (error.expose) return res.json({ state: 'signing-in' });
      throw error;
    }
    const { data, deviceId } = signedIn;
    const ban = bans.getBan(data.User.Id);
    if (ban) {
      auth.logout(data.AccessToken).catch(() => {});
      return res.status(403).json({ error: BAN_MESSAGE, reason: ban.reason, code: 'BANNED' });
    }
    // A TV stays signed in like "Angemeldet bleiben".
    const user = await startUserSession(req, data, deviceId, { rememberMe: true });
    return res.json({ state: 'done', user });
  }));

  // The phone: which device waits behind the code (for "Fernseher anmelden
  // als …?"), since when, and whether it asked from the same address as the
  // phone (same home network); a code from elsewhere deserves a warning.
  router.get('/info', requireAuth, asyncHandler(async (req, res) => {
    if (locked(req, res)) return undefined;
    const found = pairing.lookup(req.query.code);
    if (!found) {
      throttle.recordFailure(ipOf(req), THROTTLE_NAME);
      return res.status(404).json({ error: 'Der Code ist falsch oder abgelaufen.' });
    }
    return res.json({ userAgent: found.userAgent, createdAt: found.createdAt, expiresAt: found.expiresAt, sameNetwork: found.ip === ipOf(req) });
  }));

  router.post('/confirm', requireAuth, jellyfinRoute('Pairing Confirm Error', 'Bestätigung fehlgeschlagen.', async (req, res) => {
    if (locked(req, res)) return undefined;
    if (bans.isBanned(req.session.userId)) return res.status(403).json({ error: BAN_MESSAGE, code: 'BANNED' });
    try {
      await pairing.confirm(req.body?.code, { id: req.session.userId, name: req.session.username, token: req.session.accessToken });
      return res.json({ confirmed: true });
    } catch (error) {
      if (!error.expose) throw error;
      if (error.status === 404) throttle.recordFailure(ipOf(req), THROTTLE_NAME);
      return res.status(error.status).json({ error: error.message });
    }
  }));

  return router;
}

export default createPairingRouter();
