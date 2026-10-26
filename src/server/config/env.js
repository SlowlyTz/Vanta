// Environment settings from .env; throws at startup when a required value is missing.
import dotenv from 'dotenv';
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-long-random-secret';
const JELLYFIN_BASE_URL = process.env.JELLYFIN_BASE_URL;
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || '';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

if (!JELLYFIN_BASE_URL) {
  throw new Error('JELLYFIN_BASE_URL is required.');
}

// The catalogue sync runs without a user session, so it needs its own credential.
if (!JELLYFIN_API_KEY) {
  throw new Error('JELLYFIN_API_KEY is required.');
}

if (NODE_ENV === 'production' && SESSION_SECRET === 'change-this-long-random-secret') {
  throw new Error('SESSION_SECRET must be set to a secure random value in production.');
}

if (!TMDB_API_KEY) {
  throw new Error('TMDB_API_KEY is required.');
}

// Which proxies may tell Express the client's address and protocol
// (X-Forwarded-For/-Proto). The default trusts loopback and private networks,
// where a reverse proxy in front of VANTA (nginx on the LXC host) sits;
// "false" turns it off, a number trusts that many hops.
export function parseTrustProxy(value) {
  const text = String(value ?? '').trim();
  if (text === '') return 'loopback, linklocal, uniquelocal';
  if (text === 'false') return false;
  if (/^\d+$/.test(text)) return Number(text);
  return text;
}

export default {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV,
  JELLYFIN_BASE_URL,
  JELLYFIN_API_KEY,
  SESSION_SECRET,
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY),
  TMDB_API_KEY,
  TMDB_REGION: process.env.TMDB_REGION || 'DE',
  TMDB_REQUEST_TIMEOUT_MS: Number(process.env.TMDB_REQUEST_TIMEOUT_MS) > 0 ? Number(process.env.TMDB_REQUEST_TIMEOUT_MS) : 2500,
  // Optional: where resized poster/backdrop renditions are stored (default cache/images).
  IMAGE_CACHE_DIR: process.env.IMAGE_CACHE_DIR || '',
  // Optional: upper limit of that directory in MB (default 2048); the least
  // recently used renditions are deleted beyond it.
  IMAGE_CACHE_MAX_BYTES: Number.parseInt(process.env.IMAGE_CACHE_MAX_MB || '', 10) > 0
    ? Number.parseInt(process.env.IMAGE_CACHE_MAX_MB, 10) * 1024 * 1024
    : null,
  // Optional: Web Push keys. Without them VANTA makes its own pair on the
  // first start and keeps it in requests.db (app_settings).
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@usevanta.de',
};
