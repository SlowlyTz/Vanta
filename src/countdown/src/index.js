import { isLowPower, pixelRatio } from '../../shared/particles/device.js';
import { buildDigitTargets, ensureFont } from './digits.js';
import { createCountdownScene } from './scene.js';
import { countdownAt, secondsIntoCountdown, withLateGather } from './timeline.js';

let prepared = null;

// Loads the font and samples the digits ahead of time (the lobby calls this
// while people get ready), so mounting at the countdown is only the WebGL
// setup. Safe to call more than once.
export function prepareCountdown() {
  if (!prepared) {
    const lowPower = isLowPower();
    prepared = ensureFont().then(() => buildDigitTargets({ count: lowPower ? 5000 : 12000 }));
    prepared.catch(() => { prepared = null; });
  }
  return prepared;
}

// Renders the five-second watch-party countdown into `container`. Every frame
// asks `now()` (the server clock) where it stands, so all clients show the
// same digit at the same moment. `fadeTarget` (the whole cover, by default the
// container) fades out over the last moments and reveals what lies beneath;
// `done` resolves when the counted five seconds are over.
export async function mountCountdown({ container, fadeTarget = container, startsAtServerTimeMs, durationMs = 5000, now }) {
  const lowPower = isLowPower();
  const digits = await prepareCountdown();

  const canvas = document.createElement('canvas');
  canvas.className = 'watch-party-countdown-canvas';
  container.appendChild(canvas);

  const measure = () => ({ width: container.clientWidth || window.innerWidth, height: container.clientHeight || window.innerHeight });
  const size = measure();
  const view = createCountdownScene({ canvas, digits, width: size.width, height: size.height, dpr: pixelRatio(lowPower) });
  const onResize = () => {
    const next = measure();
    view.resize(next.width, next.height);
  };
  window.addEventListener('resize', onResize);

  let frame = null;
  let destroyed = false;
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  const startedAt = performance.now();

  const draw = () => {
    if (destroyed) return;
    const s = secondsIntoCountdown(startsAtServerTimeMs, now(), durationMs);
    const at = withLateGather(countdownAt(s, durationMs), (performance.now() - startedAt) / 1000);
    view.render(at, (performance.now() - startedAt) / 1000);
    fadeTarget.style.opacity = String(1 - at.fade);
    if (at.done) {
      resolveDone();
      return;
    }
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);

  return {
    done,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      view.dispose();
      canvas.remove();
      fadeTarget.style.opacity = '';
      resolveDone();
    }
  };
}
