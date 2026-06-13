import dotenv from 'dotenv';
dotenv.config();

export default {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JELLYFIN_BASE_URL: process.env.JELLYFIN_BASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET || 'change-this-long-random-secret',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
};
