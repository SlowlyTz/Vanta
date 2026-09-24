import crypto from 'crypto';
import { formatClock } from '../../../public/js/shared/time.js';

export function ownerError(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}

export function isPlaybackControlAllowed(party) {
  return party.status === 'playing' || party.status === 'paused';
}

// Notifications addressed to the person themselves share the icon of the
// version the others see.
const ICON_ALIASES = {
  member_rejoined: 'member_joined',
  member_promoted_self: 'member_promoted',
  member_demoted_self: 'member_demoted'
};

// `userId`/`username` name who the notification is about (who pressed play,
// who joined); clients show that person's avatar next to the text.
export function createNotification(type, { userId = null, username, positionMs } = {}) {
  const name = username || 'Jemand';
  const messages = {
    member_joined: `${name} ist beigetreten.`,
    member_rejoined: `${name} ist beigetreten.`,
    member_left: `${name} hat die Watch Party verlassen.`,
    owner_play: `${name} hat die Wiedergabe gestartet.`,
    owner_pause: `${name} hat pausiert.`,
    owner_seek: `${name} ist zu ${formatClock((Number(positionMs) || 0) / 1000)} gesprungen.`,
    member_promoted: `${name} ist jetzt Admin.`,
    member_promoted_self: 'Du bist jetzt Admin.',
    member_demoted: `${name} ist kein Admin mehr.`,
    member_demoted_self: 'Du bist kein Admin mehr.',
    member_banned: `${name} wurde aus der Watch Party gebannt.`,
    next_episode_cancelled: `${name} hat die nächste Folge abgebrochen.`
  };

  return {
    type: 'NOTIFICATION',
    notification: {
      id: crypto.randomUUID(),
      type,
      icon: ICON_ALIASES[type] || type,
      message: messages[type] || 'Watch Party aktualisiert.',
      actor: username ? { userId, username } : null,
      createdAt: Date.now()
    }
  };
}
