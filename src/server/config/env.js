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

export default {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV,
  JELLYFIN_BASE_URL,
  JELLYFIN_API_KEY,
  SESSION_SECRET,
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  TMDB_API_KEY,
  // Optional: where resized poster/backdrop renditions are stored (default cache/images).
  IMAGE_CACHE_DIR: process.env.IMAGE_CACHE_DIR || '',
};
