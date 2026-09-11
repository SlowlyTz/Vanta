import { sampleLogo } from './sample-logo.js';
import { createIntroScene } from './scene.js';
import { DURATION } from './timeline.js';

const SAMPLE_WIDTH = 1086;

const isLowPower = () =>
  (window.matchMedia?.('(pointer: coarse)').matches) || (navigator.hardwareConcurrency || 8) <= 4;

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`intro logo failed to load: ${src}`));
  img.src = src;
});

function readPixels(img, width) {
  const height = Math.round(img.naturalHeight * (width / img.naturalWidth));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

// Plays the whole opening scene inside `overlay` and resolves once the cover
// has faded out. The caller removes the overlay; on any error it rejects and
// the caller falls through to the app.
export async function playIntro(overlay, { logo = '/assets/logo2.png' } = {}) {
  const canvas = overlay.querySelector('canvas') || overlay.appendChild(document.createElement('canvas'));
  const lowPower = isLowPower();
  const img = await loadImage(logo);
  const sample = sampleLogo(readPixels(img, SAMPLE_WIDTH), { count: lowPower ? 16000 : 38000 });

  const view = createIntroScene({
    canvas,
    sample,
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2)
  });
  const onResize = () => view.resize(window.innerWidth, window.innerHeight);
  window.addEventListener('resize', onResize);

  try {
    await new Promise((resolve) => {
      let startedAt = 0;
      const frame = (now) => {
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
