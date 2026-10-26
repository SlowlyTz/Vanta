// Signing a TV in with a phone: a six-digit code the phone confirms, backed
// by Jellyfin Quick Connect.
import crypto from 'crypto';
import { AuthService } from './jellyfin/auth.service.js';
import { createDeviceId } from './jellyfin/client.js';
import { httpError } from '../utils/httpError.js';

export const PAIRING_TTL_MS = 5 * 60 * 1000;
export const MAX_OPEN_PER_IP = 10;
// Open codes overall: each holds a Jellyfin Quick Connect request, and many
// addresses must not fill the six-digit space either.
export const MAX_OPEN_TOTAL = 200;

// The service's own answers (`expose`), told apart from Jellyfin's errors.
const fail = (status, message, code = undefined) => httpError(status, message, { code, expose: true });

// The TV holds a Quick Connect request with its own device id; the phone
// approves it with its token, which is never handed over. Codes live five
// minutes in memory and are used up once the TV signed in.
export function createPairingService({
  auth = AuthService,
  now = () => Date.now(),
  randomCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0'),
  randomToken = () => crypto.randomBytes(24).toString('hex')
} = {}) {
  const byToken = new Map();
  const byCode = new Map();

  const drop = (pairing) => {
    byToken.delete(pairing.token);
    byCode.delete(pairing.code);
  };

  const prune = () => {
    for (const pairing of byToken.values()) if (pairing.expiresAt <= now()) drop(pairing);
  };

  const freshCode = () => {
    for (let i = 0; i < 20; i++) {
      const code = randomCode();
      if (!byCode.has(code)) return code;
    }
    throw fail(503, 'Gerade ist kein Code frei. Bitte versuche es gleich noch einmal.');
  };

  return {
    async start({ ip, userAgent = '' }) {
      prune();
      if (byToken.size >= MAX_OPEN_TOTAL) throw fail(503, 'Gerade sind zu viele Codes offen. Bitte versuche es gleich noch einmal.');
      const open = [...byToken.values()].filter(pairing => pairing.ip === ip).length;
      if (open >= MAX_OPEN_PER_IP) throw fail(429, 'Zu viele offene Codes. Bitte warte ein paar Minuten.');
      const deviceId = createDeviceId();
      let request;
      try {
        request = await auth.quickConnectInitiate(deviceId);
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          throw fail(409, 'Quick Connect ist auf dem Jellyfin-Server ausgeschaltet. Bitte melde dich mit Benutzername an.', 'QUICK_CONNECT_DISABLED');
        }
        throw error;
      }
      const pairing = {
        token: randomToken(),
        code: freshCode(),
        secret: request.Secret,
        jellyfinCode: request.Code,
        deviceId,
        ip,
        userAgent: String(userAgent).slice(0, 300),
        createdAt: now(),
        expiresAt: now() + PAIRING_TTL_MS,
        confirmedBy: null,
        signingIn: false
      };
      byToken.set(pairing.token, pairing);
      byCode.set(pairing.code, pairing);
      return pairing;
    },

    // For the phone: which device waits behind a code.
    lookup(code) {
      prune();
      return byCode.get(String(code || '').trim()) || null;
    },

    async confirm(code, user) {
      const pairing = this.lookup(code);
      if (!pairing) throw fail(404, 'Der Code ist falsch oder abgelaufen.');
      if (pairing.confirmedBy) throw fail(409, 'Dieser Code wurde schon bestätigt.');
      await auth.quickConnectAuthorize(pairing.jellyfinCode, { token: user.token, userId: user.id });
      pairing.confirmedBy = { id: user.id, name: user.name };
      return pairing;
    },

    // For the TV: 'waiting', 'confirmed', 'signing-in' or 'expired' (also
    // for an unknown token).
    status(token) {
      prune();
      const pairing = byToken.get(token);
      if (!pairing) return { state: 'expired', pairing: null };
      if (pairing.signingIn) return { state: 'signing-in', pairing };
      return { state: pairing.confirmedBy ? 'confirmed' : 'waiting', pairing };
    },

    // The TV signs in; the code is used up only once that worked, so a
    // Jellyfin hiccup lets the next poll try again.
    async finish(token) {
      const { state, pairing } = this.status(token);
      if (state !== 'confirmed') throw fail(409, 'Noch nicht bestätigt.');
      pairing.signingIn = true;
      try {
        const data = await auth.quickConnectLogin(pairing.secret, { deviceId: pairing.deviceId });
        drop(pairing);
        return { data, deviceId: pairing.deviceId };
      } finally {
        pairing.signingIn = false;
      }
    },

    size: () => byToken.size
  };
}

export const PairingService = createPairingService();
