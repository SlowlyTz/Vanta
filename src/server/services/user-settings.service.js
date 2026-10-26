// Per-user limits set by an admin (concurrent streams), kept in
// db/user/settings.json.
import { createJsonStore } from '../utils/jsonStore.js';
import { join } from 'path';
import { httpError } from '../utils/httpError.js';
import { USER_DB_DIR } from '../config/paths.js';


export const DEFAULT_MAX_CONCURRENT_STREAMS = 1;
const MAX_ALLOWED_STREAMS = 20;

const emptySettings = () => ({ users: {} });

function isValidStreamLimit(value) {
  return Number.isInteger(value) && value >= 0 && value <= MAX_ALLOWED_STREAMS;
}

export function createUserSettingsService({ dbDir = USER_DB_DIR } = {}) {
  const settingsFile = join(dbDir, 'settings.json');

  const store = createJsonStore(settingsFile, {
    empty: emptySettings,
    parse: parsed => ({ users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {} }),
    label: 'settings.json'
  });
  const readSettings = () => store.read();
  const writeSettings = settings => store.write(settings);

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

    setMaxConcurrentStreams(userId, value, updatedBy = null) {
      if (!userId) {
        throw httpError(400, 'Kein Nutzer angegeben');
      }

      const numericValue = Number(value);
      if (!isValidStreamLimit(numericValue)) {
        throw httpError(400, `Das Stream-Limit muss eine ganze Zahl von 0 bis ${MAX_ALLOWED_STREAMS} sein`);
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
