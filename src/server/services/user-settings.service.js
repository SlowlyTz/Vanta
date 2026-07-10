import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_USER_DB_DIR = join(dirname(dirname(dirname(__dirname))), 'db', 'user');

export const DEFAULT_MAX_CONCURRENT_STREAMS = 1;
const MAX_ALLOWED_STREAMS = 20;

const emptySettings = () => ({ users: {} });

function isValidStreamLimit(value) {
  return Number.isInteger(value) && value >= 0 && value <= MAX_ALLOWED_STREAMS;
}

export function createUserSettingsService({ dbDir = DEFAULT_USER_DB_DIR } = {}) {
  const settingsFile = join(dbDir, 'settings.json');

  function readSettings() {
    if (!fs.existsSync(settingsFile)) return emptySettings();

    try {
      const parsed = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      return { users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {} };
    } catch (error) {
      console.warn('[UserSettingsService] Could not read settings.json:', error.message);
      return emptySettings();
    }
  }

  function writeSettings(settings) {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const tmpFile = `${settingsFile}.tmp`;
    fs.writeFileSync(tmpFile, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
    fs.renameSync(tmpFile, settingsFile);
  }

  return {
    getSettings(userId) {
      const settings = readSettings();
      const entry = settings.users[userId];
      return {
        maxConcurrentStreams: isValidStreamLimit(entry?.maxConcurrentStreams)
          ? entry.maxConcurrentStreams
          : DEFAULT_MAX_CONCURRENT_STREAMS
      };
    },

    getMaxConcurrentStreams(userId) {
      return this.getSettings(userId).maxConcurrentStreams;
    },

    setMaxConcurrentStreams(userId, value, updatedBy = null) {
      if (!userId) {
        const error = new Error('userId is required');
        error.status = 400;
        throw error;
      }

      const numericValue = Number(value);
      if (!isValidStreamLimit(numericValue)) {
        const error = new Error(`maxConcurrentStreams must be an integer between 0 and ${MAX_ALLOWED_STREAMS}`);
        error.status = 400;
        throw error;
      }

      const settings = readSettings();
      settings.users[userId] = {
        maxConcurrentStreams: numericValue,
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy ? { userId: updatedBy.userId, username: updatedBy.username } : null
      };

      writeSettings(settings);
      return settings.users[userId];
    }
  };
}

export const UserSettingsService = createUserSettingsService();
