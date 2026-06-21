import { clampPosition } from './time.js';

const END_EPSILON_SECONDS = 0.25;

export function getSeekableEnd(player) {
  if (!player?.seekable?.length) return null;
  try {
    return Number(player.seekable.end(player.seekable.length - 1)) || null;
  } catch {
    return null;
  }
}

export function clampSeekTarget(target, player, endEpsilon = END_EPSILON_SECONDS) {
  let duration = Number(player?.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    const seekableEnd = getSeekableEnd(player);
    if (Number.isFinite(seekableEnd) && seekableEnd > 0) duration = seekableEnd;
  }
  if (Number.isFinite(duration) && duration > 0) {
    return clampPosition(target, duration, endEpsilon);
  }
  return Math.max(0, Number(target) || 0);
}

export function seekTo(player, target, options = {}) {
  const clamped = clampSeekTarget(target, player, options.endEpsilon);
  if (Number.isFinite(clamped)) player.currentTime = clamped;
  return clamped;
}

export function seekBy(player, delta, options = {}) {
  const current = Number(player?.currentTime) || 0;
  return seekTo(player, current + delta, options);
}
