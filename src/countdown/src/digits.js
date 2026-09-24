import { samplePixels, sortByAngle } from '../../shared/particles/pixels.js';

const GLYPH_HEIGHT = 420;
const CANVAS_SIZE = 512;
const FONT = `700 ${GLYPH_HEIGHT}px Outfit, system-ui, sans-serif`;
const FONT_TIMEOUT_MS = 800;

// The digits are drawn with the app's own typeface; if it is slow to load
// the system face stands in rather than delaying the countdown.
export async function ensureFont(fonts = document.fonts) {
  if (!fonts?.load) return;
  await Promise.race([
    fonts.load(FONT, '54321').catch(() => {}),
    new Promise(resolve => setTimeout(resolve, FONT_TIMEOUT_MS))
  ]);
}

export function drawDigit(digit, createCanvas = () => document.createElement('canvas')) {
  const canvas = createCanvas();
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  context.fillStyle = '#fff';
  context.font = FONT;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(digit), CANVAS_SIZE / 2, CANVAS_SIZE / 2 + GLYPH_HEIGHT * 0.04);
  return context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

// One target set per digit, all with the same number of points, in the
// order the countdown shows them (5, 4, 3, 2, 1).
export function buildDigitTargets({ digits = [5, 4, 3, 2, 1], count, random = Math.random, draw = drawDigit }) {
  const targets = digits.map(digit => {
    const sample = samplePixels(draw(digit), { count, random });
    return { digit, positions: sortByAngle(sample.positions), bounds: sample.bounds, spacing: sample.spacing };
  });
  const height = Math.max(...targets.map(target => target.bounds.maxY - target.bounds.minY));
  const spacing = Math.max(...targets.map(target => target.spacing));
  return { targets, height, spacing };
}
