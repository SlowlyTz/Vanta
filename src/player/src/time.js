export const TICKS_PER_SECOND = 10_000_000;

export function toTicks(seconds) {
  return Math.max(0, Math.round((Number(seconds) || 0) * TICKS_PER_SECOND));
}

export function fromTicks(ticks) {
  return Math.max(0, Number(ticks) || 0) / TICKS_PER_SECOND;
}

export function clampPosition(seconds, duration, endEpsilon = 0) {
  const safePosition = Math.max(0, Number(seconds) || 0);
  if (!Number.isFinite(duration) || duration <= 0) return safePosition;
  const maxPosition = Math.max(0, duration - Math.max(0, Number(endEpsilon) || 0));
  return Math.min(safePosition, maxPosition);
}
