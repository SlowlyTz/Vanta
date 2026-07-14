import { MediaApi } from '../../api/media.api.js';

export const PLAYER_MODULE_URL = '/vendor/player/vanta-player.js';
export const OWNER_SYNC_INTERVAL_MS = 5000;
export const AUTO_SYNC_NOTIFICATION_COOLDOWN_MS = 15_000;

export const PLAYER_ROOM_STATUSES = new Set(['ready-room', 'countdown', 'playing', 'paused']);
export const PLAYBACK_STATUSES = new Set(['playing', 'paused']);

export function shouldShowPlayerForParty(nextParty) {
  return PLAYER_ROOM_STATUSES.has(nextParty?.status);
}

export function connectedMemberCount(members) {
  return members.filter(member => member.connected).length;
}

export function memberInitial(username) {
  return (username || '?').trim().charAt(0).toUpperCase() || '?';
}

export function formatPosition(positionMs) {
  if (!positionMs || positionMs <= 0) return 'Von Anfang an';
  const totalSeconds = Math.floor(positionMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
  return `Fortsetzen bei ${time}`;
}

export function formatRuntime(runtimeTicks) {
  if (!runtimeTicks) return null;
  const minutes = Math.round(runtimeTicks / 10_000_000 / 60);
  return minutes > 0 ? `${minutes} Min.` : null;
}

export function countdownMetaParts(snapshot) {
  const parts = [];
  if (snapshot.productionYear) parts.push(String(snapshot.productionYear));
  if (snapshot.officialRating) parts.push(snapshot.officialRating);
  if (snapshot.communityRating) parts.push(`★ ${Number(snapshot.communityRating).toFixed(1)}`);
  const runtime = formatRuntime(snapshot.runtimeTicks);
  if (runtime) parts.push(runtime);
  return parts;
}

export function getPosterUrl(item) {
  const imageOwnerId = item.ParentBackdropItemId || item.Id;
  const tag = item.ParentBackdropImageTags?.[0] || item.BackdropImageTags?.[0];
  return MediaApi.getImageUrl(imageOwnerId, 'Backdrop', 1920, { tag, quality: 90 });
}

const NOTIFICATION_ICONS = {
  member_joined: '+',
  member_left: '-',
  owner_play: '▶',
  owner_pause: 'Ⅱ',
  owner_seek: '↔',
  auto_sync: '↻',
  member_promoted: '★',
  member_banned: '!'
};

export function notificationIcon(type) {
  return NOTIFICATION_ICONS[type] || 'i';
}
