import dotenv from 'dotenv';
dotenv.config();

export default {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JELLYFIN_BASE_URL: process.env.JELLYFIN_BASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET || 'change-this-long-random-secret',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  SEER_API_KEY: process.env.SEER_API_KEY || '',
  SEER_BASE_URL: process.env.SEER_BASE_URL || '',
  get SEER_ENABLED() {
    return this.SEER_API_KEY.length > 0;
  }
};
