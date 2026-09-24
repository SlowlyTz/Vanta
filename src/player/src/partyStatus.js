// How a party member's player is doing, as shown in the settings flyout.

export const STATUS_LABELS = {
  sync: 'Synchron',
  correcting: 'Gleicht an',
  buffering: 'Puffert …',
  paused: 'Pausiert',
  blocked: 'Wiedergabe blockiert'
};

export function memberStatus(member) {
  if (!member?.connected) return { key: 'offline', label: 'Offline' };
  const key = STATUS_LABELS[member.playbackState] ? member.playbackState : 'unknown';
  if (key === 'unknown') return { key, label: 'Verbunden' };
  const drift = Number(member.driftMs);
  const label = key === 'sync' && Number.isFinite(drift)
    ? `Synchron · ±${Math.abs(Math.round(drift))} ms`
    : STATUS_LABELS[key];
  return { key, label };
}

// Same colour per member as in the lobby (golden-angle hash of the id).
export function memberHue(userId = '') {
  let hash = 0;
  for (const char of String(userId)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return Math.round((hash * 137.508) % 360);
}
