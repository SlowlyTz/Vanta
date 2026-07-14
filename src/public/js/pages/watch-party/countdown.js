import { countdownMetaParts, formatPosition } from './helpers.js';

export function bindCountdown(ctx) {
  ctx.showCountdown = ({ startsAtServerTimeMs, positionMs }) => {
    ctx.hideReadyOverlay();
    ctx.countdownOverlay.hidden = false;
    if (ctx.countdownTimer) window.clearInterval(ctx.countdownTimer);

    const snapshot = ctx.party?.itemSnapshot || {};
    const metaParts = countdownMetaParts(snapshot);
    ctx.countdownTitle.textContent = snapshot.name || 'Unbekanntes Medium';
    ctx.countdownMeta.textContent = metaParts.join(' · ');
    ctx.countdownMeta.hidden = metaParts.length === 0;
    ctx.countdownPosition.textContent = formatPosition(positionMs);

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((startsAtServerTimeMs - Date.now()) / 1000));
      ctx.countdownNumber.textContent = String(remaining);
      if (remaining <= 0) {
        window.clearInterval(ctx.countdownTimer);
        ctx.countdownTimer = null;
      }
    };

    tick();
    ctx.countdownTimer = window.setInterval(tick, 250);
  };

  ctx.hideCountdown = () => {
    ctx.countdownOverlay.hidden = true;
    if (ctx.countdownTimer) {
      window.clearInterval(ctx.countdownTimer);
      ctx.countdownTimer = null;
    }
  };

  return ctx;
}
