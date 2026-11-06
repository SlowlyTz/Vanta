// The colours of a loaded cover image: a strong one that stands for the
// poster and a second, different one, darkened enough to sit behind white
// text, plus brighter `…Vivid` takes. Images come from VANTA's own image
// proxy, so the canvas may read them. Results are kept per image URL.

const SAMPLE_WIDTH = 24;
const SAMPLE_HEIGHT = 36;
const MAX_CACHED = 300;
const cache = new Map();

const toHsl = ([r, g, b]) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l: lightness };
  const s = delta / (1 - Math.abs(2 * lightness - 1));
  let h;
  if (max === red) h = ((green - blue) / delta) % 6;
  else if (max === green) h = (blue - red) / delta + 2;
  else h = (red - green) / delta + 4;
  return { h: (h * 60 + 360) % 360, s, l: lightness };
};

const hueDistance = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

// Keeps the hue, caps how bright it gets: a background, not a highlight.
function tone([r, g, b], maxLight = 0.42) {
  const brightest = Math.max(r, g, b, 1);
  const scale = Math.min(1, (maxLight * 255 * 1.6) / brightest);
  return [Math.round(r * scale), Math.round(g * scale), Math.round(b * scale)];
}

// Brightens a dark colour until it stands out on black, keeping its hue.
function lift(rgb, minBrightest = 170) {
  const brightest = Math.max(...rgb);
  if (brightest >= minBrightest) return rgb;
  if (brightest < 8) return [minBrightest, minBrightest, minBrightest];
  const scale = minBrightest / brightest;
  return rgb.map(channel => Math.min(255, Math.round(channel * scale)));
}

// Pixels grouped into coarse colour buckets; a bucket counts more the more
// saturated it is, so a red title on a grey poster still wins.
export function pickCoverColors(data) {
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    buckets.set(key, bucket);
  }
  if (buckets.size === 0) return null;

  const ranked = [...buckets.values()].map(bucket => {
    const rgb = [bucket.r / bucket.count, bucket.g / bucket.count, bucket.b / bucket.count];
    const hsl = toHsl(rgb);
    // Near black and near white say little about a poster.
    const usable = hsl.l > 0.08 && hsl.l < 0.92;
    return { rgb, hsl, score: bucket.count * (usable ? 0.25 + hsl.s * 1.5 : 0.05) };
  }).sort((a, b) => b.score - a.score);

  const primary = ranked[0];
  const secondary = ranked.find(entry => entry !== primary && entry.hsl.s > 0.15 && hueDistance(entry.hsl.h, primary.hsl.h) > 35)
    || ranked.find(entry => entry !== primary)
    || primary;
  return {
    primary: tone(primary.rgb),
    secondary: tone(secondary.rgb, 0.32),
    // Brighter takes for marks drawn on the page (the Top 10 numbers).
    primaryVivid: lift(primary.rgb.map(Math.round)),
    secondaryVivid: lift(secondary.rgb.map(Math.round), 120)
  };
}

// Null while the image is not loaded, or when the browser refuses to read it.
export function coverColorsOf(img) {
  const key = img?.currentSrc || img?.src;
  if (!key || !img.complete || !img.naturalWidth) return null;
  if (cache.has(key)) return cache.get(key);

  let colors = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;
    const context = canvas.getContext('2d');
    context.drawImage(img, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    colors = pickCoverColors(context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data);
  } catch {
    colors = null;
  }
  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value);
  cache.set(key, colors);
  return colors;
}

// Waits for the image when it is still loading.
export function whenCoverColors(img) {
  const colors = coverColorsOf(img);
  if (colors || !img || (img.complete && img.naturalWidth)) return Promise.resolve(colors);
  return new Promise(resolve => {
    const done = () => resolve(coverColorsOf(img));
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', () => resolve(null), { once: true });
  });
}

export const rgbText = (rgb) => rgb.join(', ');
