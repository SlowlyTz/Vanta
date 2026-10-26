// Spatial navigation for remotes: which element lies next in a direction.
// Pure geometry, shared by the app's TV focus engine and the player.

// How far `to` lies from `from` in the direction; Infinity when not that way.
// Measured from the edges, the offset across counts double, and overlapping
// on the cross axis wins over sitting diagonally.
export function directionalScore(from, to, direction) {
  let along;
  let crossGap;
  if (direction === 'left' || direction === 'right') {
    along = direction === 'right' ? to.left - from.right : from.left - to.right;
    crossGap = Math.max(0, Math.max(from.top, to.top) - Math.min(from.bottom, to.bottom));
    if (along < -Math.min(from.width, to.width) / 2) return Infinity;
  } else {
    along = direction === 'down' ? to.top - from.bottom : from.top - to.bottom;
    crossGap = Math.max(0, Math.max(from.left, to.left) - Math.min(from.right, to.right));
    if (along < -Math.min(from.height, to.height) / 2) return Infinity;
  }
  const fromCenter = direction === 'left' || direction === 'right' ? (from.top + from.bottom) / 2 : (from.left + from.right) / 2;
  const toCenter = direction === 'left' || direction === 'right' ? (to.top + to.bottom) / 2 : (to.left + to.right) / 2;
  const overlapBonus = crossGap === 0 ? 0 : 1000;
  return Math.max(0, along) + 2 * crossGap + overlapBonus + Math.abs(fromCenter - toCenter) * 0.1;
}
