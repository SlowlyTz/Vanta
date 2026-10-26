// Brute-force brake for the login. Locked attempts never reach Jellyfin, so
// its own per-user lockout does not trip.
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const LOGIN_THROTTLE_DEFAULTS = {
  attemptsPerLock: 3,
  ipAttemptsPerLock: 20,
  firstLockMs: MINUTE_MS,
  maxLockMs: DAY_MS,
  forgetAfterMs: DAY_MS,
  maxEntries: 10000
};

// Failures count per IP and username (nobody locks a real user out from
// elsewhere) and, more generously, per IP alone. Each lock doubles, 1 minute
// up to 24 hours; a quiet day after the last lock or a success starts over.
export function createLoginThrottle({ now = () => Date.now(), ...options } = {}) {
  const config = { ...LOGIN_THROTTLE_DEFAULTS, ...options };
  const entries = new Map(); // key -> { failures, locks, lockedUntil, lastFailureAt }
  // For the admin dashboard: counts since the server started, no names.
  const counts = { successes: 0, failures: 0, locks: 0 };

  const userKey = (ip, username) => `u:${ip}:${String(username || '').trim().toLowerCase()}`;
  const ipKey = (ip) => `ip:${ip}`;

  const current = (key) => {
    const entry = entries.get(key);
    if (!entry) return null;
    const time = now();
    // The quiet day counts from the end of the last lock, so a 24-hour lock
    // does not wipe the history the moment it runs out.
    if (time - Math.max(entry.lastFailureAt, entry.lockedUntil) >= config.forgetAfterMs) {
      entries.delete(key);
      return null;
    }
    return entry;
  };

  const remainingLock = (key) => {
    const entry = current(key);
    return entry && entry.lockedUntil > now() ? entry.lockedUntil - now() : 0;
  };

  const prune = () => {
    if (entries.size < config.maxEntries) return;
    for (const key of entries.keys()) current(key);
    // Still full: drop the oldest entries (Map keeps insertion order).
    for (const key of entries.keys()) {
      if (entries.size < config.maxEntries) break;
      entries.delete(key);
    }
  };

  const fail = (key, attemptsPerLock) => {
    const time = now();
    let entry = current(key);
    if (!entry) {
      prune();
      entry = { failures: 0, locks: 0, lockedUntil: 0, lastFailureAt: time };
      entries.set(key, entry);
    }
    entry.failures += 1;
    entry.lastFailureAt = time;
    if (entry.failures < attemptsPerLock) return 0;

    const lockMs = Math.min(config.firstLockMs * 2 ** entry.locks, config.maxLockMs);
    entry.failures = 0;
    entry.locks += 1;
    entry.lockedUntil = time + lockMs;
    return lockMs;
  };

  return {
    // Milliseconds this attempt still has to wait; 0 means it may go ahead.
    check(ip, username) {
      return Math.max(remainingLock(userKey(ip, username)), remainingLock(ipKey(ip)));
    },

    // Records wrong credentials; returns the lock that started now, if any.
    recordFailure(ip, username) {
      const userLock = fail(userKey(ip, username), config.attemptsPerLock);
      const ipLock = fail(ipKey(ip), config.ipAttemptsPerLock);
      counts.failures += 1;
      if (userLock || ipLock) counts.locks += 1;
      return Math.max(userLock, ipLock);
    },

    // Right credentials clear this username's history from this address.
    recordSuccess(ip, username) {
      entries.delete(userKey(ip, username));
      counts.successes += 1;
    },

    stats() {
      const time = now();
      const activeLocks = [...entries.values()].filter(entry => entry.lockedUntil > time).length;
      return { ...counts, activeLocks };
    },

    size: () => entries.size,
    clear: () => entries.clear()
  };
}

export const loginThrottle = createLoginThrottle();

// "1 Minute", "2 Minuten", "1 Stunde 4 Minuten", rounded up to full minutes.
export function formatLockDuration(ms) {
  const totalMinutes = Math.max(1, Math.ceil(ms / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`);
  if (minutes) parts.push(`${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`);
  return parts.join(' ');
}
