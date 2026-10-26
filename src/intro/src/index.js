// Entry of the opening scene: samples the logo and plays the particle intro
// over the app.

import { isLowPower, pixelRatio } from '../../shared/particles/device.js';
import { readPixels } from '../../shared/particles/pixels.js';
import { sampleLogo } from './sample-logo.js';
import { createIntroScene } from './scene.js';
import { DURATION } from './timeline.js';

const SAMPLE_WIDTH = 1086;

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`intro logo failed to load: ${src}`));
  img.src = src;
});

// Plays the whole opening scene inside `overlay` and resolves once the cover
// has faded out, or at once when `signal` aborts (the visitor skipped it).
// The caller removes the overlay; on any error it rejects and the caller
// falls through to the app.
export async function playIntro(overlay, { logo = '/assets/logo2.png', signal = null } = {}) {
  if (signal?.aborted) return;
  const canvas = overlay.querySelector('canvas') || overlay.appendChild(document.createElement('canvas'));
  const lowPower = isLowPower();
  const img = await loadImage(logo);
  const sample = sampleLogo(readPixels(img, SAMPLE_WIDTH), { count: lowPower ? 16000 : 38000 });

  const view = createIntroScene({
    canvas,
    sample,
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: pixelRatio(lowPower)
  });
  const onResize = () => view.resize(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', onResize);

  try {
    await new Promise((resolve) => {
      let startedAt = 0;
      signal?.addEventListener('abort', resolve, { once: true });
      const frame = (now) => {
        if (signal?.aborted) return;
        if (!startedAt) startedAt = now;
        const t = (now - startedAt) / 1000;
        const at = view.render(Math.min(t, DURATION));
        overlay.style.opacity = String(1 - at.fade);
        if (at.done) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  } finally {
    window.removeEventListener('resize', onResize);
    view.dispose();
  }
}
