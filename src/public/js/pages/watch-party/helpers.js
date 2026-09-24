import { MediaApi } from '../../api/media.api.js';

export const PLAYER_MODULE_URL = '/vendor/player/vanta-player.js';
export const COUNTDOWN_MODULE_URL = '/vendor/countdown/vanta-countdown.js';
export const OWNER_SYNC_INTERVAL_MS = 5000;
export const AUTO_SYNC_NOTIFICATION_COOLDOWN_MS = 15_000;

export const PLAYBACK_STATUSES = new Set(['playing', 'paused']);

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

const SVG_NS = 'http://www.w3.org/2000/svg';

const NOTIFICATION_ICON_PATHS = {
  member_joined: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z',
  member_left: 'M19 13H5v-2h14z',
  owner_play: 'M8 5.14v13.72a1 1 0 0 0 1.53.85l10.6-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14z',
  owner_pause: 'M7 5h3v14H7zm7 0h3v14h-3z',
  owner_seek: 'M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z',
  auto_sync: 'M12 4V1L8 5l4 4V6a6 6 0 0 1 5.2 9l1.5 1.5A8 8 0 0 0 12 4zm0 14a6 6 0 0 1-5.2-9L5.3 7.5A8 8 0 0 0 12 20v3l4-4-4-4v3z',
  member_promoted: 'M12 17.3 18.2 21l-1.7-7L22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2 7.5 14l-1.7 7z',
  member_banned: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM4 12a8 8 0 0 1 12.9-6.3L5.7 16.9A7.9 7.9 0 0 1 4 12zm8 8a7.9 7.9 0 0 1-4.9-1.7L18.3 7.1A8 8 0 0 1 12 20z'
};
const INFO_ICON_PATH = 'M11 7h2v2h-2zm0 4h2v6h-2zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20z';

// Small action badge for a notification (play, pause, join …) as an SVG.
export function notificationIcon(type) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.dataset.icon = NOTIFICATION_ICON_PATHS[type] ? type : 'info';
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', NOTIFICATION_ICON_PATHS[type] || INFO_ICON_PATH);
  svg.appendChild(path);
  return svg;
}
