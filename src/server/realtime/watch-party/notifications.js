import crypto from 'crypto';

export function ownerError(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}

export function isPlaybackControlAllowed(party) {
  return party.status === 'playing' || party.status === 'paused';
}

function formatNotificationPosition(positionMs) {
  const totalSeconds = Math.max(0, Math.floor((Number(positionMs) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function createNotification(type, { username, positionMs } = {}) {
  const messages = {
    member_joined: `${username} ist beigetreten.`,
    member_rejoined: `${username} ist beigetreten.`,
    member_left: `${username} hat die Watch Party verlassen.`,
    owner_play: 'Der Admin hat die Wiedergabe gestartet.',
    owner_pause: 'Der Admin hat pausiert.',
    owner_seek: `Der Admin hat zu ${formatNotificationPosition(positionMs)} gespult.`,
    member_promoted: `${username} ist jetzt Admin.`,
    member_banned: `${username} wurde aus der Watch Party gebannt.`
  };

  return {
    type: 'NOTIFICATION',
    notification: {
      id: crypto.randomUUID(),
      type,
      icon: type === 'member_rejoined' ? 'member_joined' : type,
      message: messages[type] || 'Watch Party aktualisiert.',
      createdAt: Date.now()
    }
  };
}
