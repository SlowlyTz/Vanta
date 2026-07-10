import { UserSettingsService } from './user-settings.service.js';

const DEFAULT_MAX_STREAMS = 1;
const RESERVED_TTL_MS = 60_000;
const ACTIVE_TTL_MS = 45_000;
const QUALITY_SWITCH_WINDOW_MS = 10_000;

export class StreamSessionService {
  constructor({ getUserSettings, now = () => Date.now() } = {}) {
    this.getUserSettings = getUserSettings;
    this.now = now;
    this.sessionsByUser = new Map();
  }

  getLimit(userId) {
    const value = Number(this.getUserSettings(userId)?.maxConcurrentStreams);
    if (Number.isInteger(value) && value >= 0) return value;
    return DEFAULT_MAX_STREAMS;
  }

  cleanupUser(userId) {
    const sessions = this.sessionsByUser.get(userId);
    if (!sessions) return;

    const now = this.now();
    for (const [playSessionId, session] of sessions.entries()) {
      const ttl = session.state === 'reserved' ? RESERVED_TTL_MS : ACTIVE_TTL_MS;
      if (now - session.updatedAt > ttl) {
        sessions.delete(playSessionId);
      }
    }

    if (sessions.size === 0) {
      this.sessionsByUser.delete(userId);
    }
  }

  getActiveCount(userId) {
    this.cleanupUser(userId);
    return this.sessionsByUser.get(userId)?.size || 0;
  }

  reserve({ userId, username, itemId, playSessionId }) {
    if (!playSessionId) {
      const error = new Error('Playback session could not be tracked');
      error.status = 500;
      throw error;
    }

    this.cleanupUser(userId);

    const limit = this.getLimit(userId);
    const sessions = this.sessionsByUser.get(userId) || new Map();

    if (!sessions.has(playSessionId) && sessions.size >= limit) {
      const replaceable = this.findReplaceableQualitySwitchSession(sessions, itemId);

      if (replaceable) {
        sessions.delete(replaceable);
      } else {
        const error = new Error(`Stream-Limit erreicht. Maximal erlaubt: ${limit}`);
        error.status = 429;
        error.code = 'STREAM_LIMIT_REACHED';
        error.limit = limit;
        error.activeStreams = sessions.size;
        throw error;
      }
    }

    sessions.set(playSessionId, {
      userId,
      username,
      itemId,
      playSessionId,
      state: 'reserved',
      createdAt: sessions.get(playSessionId)?.createdAt || this.now(),
      updatedAt: this.now()
    });

    this.sessionsByUser.set(userId, sessions);
  }

  // A quality switch issues a new playSessionId for the same item before the
  // old one receives a stop event. Treat a very recent reserved session for
  // the same item as replaceable instead of counting it as a second stream.
  findReplaceableQualitySwitchSession(sessions, itemId) {
    const now = this.now();

    for (const [id, session] of sessions.entries()) {
      if (
        session.state === 'reserved' &&
        session.itemId === itemId &&
        (now - session.createdAt) < QUALITY_SWITCH_WINDOW_MS
      ) {
        return id;
      }
    }

    return null;
  }

  markStarted(userId, playSessionId) {
    this.touch(userId, playSessionId, 'playing');
  }

  touch(userId, playSessionId, state = null) {
    this.cleanupUser(userId);
    const session = this.sessionsByUser.get(userId)?.get(playSessionId);
    if (!session) return false;
    if (state) session.state = state;
    session.updatedAt = this.now();
    return true;
  }

  release(userId, playSessionId) {
    const sessions = this.sessionsByUser.get(userId);
    if (!sessions) return false;
    const deleted = sessions.delete(playSessionId);
    if (sessions.size === 0) this.sessionsByUser.delete(userId);
    return deleted;
  }
}

export const streamSessionService = new StreamSessionService({
  getUserSettings: (userId) => UserSettingsService.getSettings(userId)
});
