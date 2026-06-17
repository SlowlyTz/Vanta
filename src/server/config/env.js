import dotenv from 'dotenv';
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-long-random-secret';
const JELLYFIN_BASE_URL = process.env.JELLYFIN_BASE_URL;
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

if (!JELLYFIN_BASE_URL) {
  throw new Error('JELLYFIN_BASE_URL is required.');
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
  SESSION_SECRET,
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  TMDB_API_KEY,
};
