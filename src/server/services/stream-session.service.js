import { UserSettingsService } from './user-settings.service.js';
import { deviceLabel } from '../../public/js/shared/deviceLabel.js';

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

  // `replacesPlaySessionId`: the session this one takes over (the player
  // switching audio track or quality); it is released first, so a running
  // stream is not counted twice. A device plays one stream at a time: a new
  // session from the same login (`deviceId`) replaces that device's older
  // ones, also for another title, so a player left before it started does
  // not block the next one. Returns the replaced playSessionIds; their
  // encodings are dead weight on Jellyfin.
  reserve({ userId, username, itemId, playSessionId, replacesPlaySessionId = null, deviceId = null, userAgent = '' }) {
    if (!playSessionId) {
      const error = new Error('Playback session could not be tracked');
      error.status = 500;
      throw error;
    }

    this.cleanupUser(userId);

    const limit = this.getLimit(userId);
    const sessions = this.sessionsByUser.get(userId) || new Map();
    const replaced = [];
    const drop = id => {
      if (id === playSessionId || !sessions.delete(id)) return;
      replaced.push(id);
    };
    if (replacesPlaySessionId) drop(replacesPlaySessionId);
    if (deviceId) {
      for (const [id, session] of [...sessions.entries()]) {
        if (session.deviceId === deviceId) drop(id);
      }
    }

    if (!sessions.has(playSessionId) && sessions.size >= limit) {
      const replaceable = this.findReplaceableQualitySwitchSession(sessions, itemId);

      if (replaceable) {
        // Possibly another device's start: only stop counting it.
        sessions.delete(replaceable);
      } else {
        if (sessions.size === 0) this.sessionsByUser.delete(userId);
        const error = this.limitError(limit, sessions);
        error.replaced = replaced;
        throw error;
      }
    }

    sessions.set(playSessionId, {
      userId,
      username,
      itemId,
      playSessionId,
      deviceId,
      userAgent: String(userAgent || '').slice(0, 300),
      state: 'reserved',
      createdAt: sessions.get(playSessionId)?.createdAt || this.now(),
      updatedAt: this.now()
    });

    this.sessionsByUser.set(userId, sessions);
    return replaced;
  }

  // Names the device holding the slot, so the viewer knows where to stop it.
  limitError(limit, sessions) {
    const running = [...sessions.values()].sort((a, b) => b.createdAt - a.createdAt);
    let message;
    if (limit === 0 || running.length === 0) {
      message = 'Für dein Konto ist das Abspielen gerade gesperrt.';
    } else {
      const latest = running[0];
      const minutes = Math.max(1, Math.round((this.now() - latest.createdAt) / 60_000));
      const where = `${deviceLabel(latest.userAgent)}, seit ${minutes} Min.`;
      message = running.length === 1
        ? `Auf deinem Konto läuft schon ein Stream (${where}). Beende ihn dort oder versuche es in einer Minute noch einmal.`
        : `Auf deinem Konto laufen schon ${running.length} Streams (zuletzt ${where}). Beende einen davon oder versuche es in einer Minute noch einmal.`;
    }
    const error = new Error(message);
    error.status = 429;
    error.code = 'STREAM_LIMIT_REACHED';
    error.limit = limit;
    error.activeStreams = sessions.size;
    return error;
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

  // Answers the released session, or null when it was not tracked.
  release(userId, playSessionId) {
    const sessions = this.sessionsByUser.get(userId);
    const session = sessions?.get(playSessionId) || null;
    if (!session) return null;
    sessions.delete(playSessionId);
    if (sessions.size === 0) this.sessionsByUser.delete(userId);
    return session;
  }
}

export const streamSessionService = new StreamSessionService({
  getUserSettings: (userId) => UserSettingsService.getSettings(userId)
});
