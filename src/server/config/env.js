import dotenv from 'dotenv';
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-long-random-secret';
const JELLYFIN_BASE_URL = process.env.JELLYFIN_BASE_URL;
const SEER_API_KEY = process.env.SEER_API_KEY || '';
const SEER_BASE_URL = process.env.SEER_BASE_URL || '';

if (!JELLYFIN_BASE_URL) {
  throw new Error('JELLYFIN_BASE_URL is required.');
}

if (NODE_ENV === 'production' && SESSION_SECRET === 'change-this-long-random-secret') {
  throw new Error('SESSION_SECRET must be set to a secure random value in production.');
}

if (SEER_API_KEY && !SEER_BASE_URL) {
  throw new Error('SEER_BASE_URL is required when SEER_API_KEY is configured.');
}

export default {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV,
  JELLYFIN_BASE_URL,
  SESSION_SECRET,
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  SEER_API_KEY,
  SEER_BASE_URL,
  get SEER_ENABLED() {
    return this.SEER_API_KEY.length > 0;
  }
};
