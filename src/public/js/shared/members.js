// How a watch-party member looks everywhere (lobby, notifications, player).

// Each member keeps the same avatar colour, derived from their user id. The
// golden angle spreads ids that differ in one character (u-2, u-3) far apart.
export function memberHue(userId = '') {
  let hash = 0;
  for (const char of String(userId)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return Math.round((hash * 137.508) % 360);
}

export function memberInitial(username) {
  return String(username || '?').trim().charAt(0).toUpperCase() || '?';
}
