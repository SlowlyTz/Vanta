// Turns the logo bitmap into particle targets. Every opaque pixel is a
// candidate; the result is a uniform subset in logo units where the bitmap
// height is 1 and the origin sits at the centre of the visible logo.

const EMPTY_BOX = () => ({ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

const extend = (box, x, y) => {
  if (x < box.minX) box.minX = x;
  if (x > box.maxX) box.maxX = x;
  if (y < box.minY) box.minY = y;
  if (y > box.maxY) box.maxY = y;
};

// The V and the word are separated by the widest run of empty columns that
// lies between painted ones. Returns the column where the second group starts.
export function findSplitColumn(columns) {
  let best = { start: -1, width: 0 };
  let runStart = -1;
  let seenPaint = false;

  for (let x = 0; x < columns.length; x++) {
    const painted = columns[x] > 0;
    if (painted) {
      if (seenPaint && runStart >= 0 && x - runStart > best.width) best = { start: runStart, width: x - runStart };
      runStart = -1;
      seenPaint = true;
    } else if (runStart < 0) {
      runStart = x;
    }
  }

  return best.width > 0 ? best.start + best.width : columns.length;
}

export function sampleLogo(image, { count, random = Math.random, alphaThreshold = 40 } = {}) {
  const { width, height, data } = image;
  const columns = new Uint32Array(width);
  const candidates = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > alphaThreshold) {
        candidates.push(i / 4);
        columns[x]++;
      }
    }
  }

  const split = findSplitColumn(columns);
  const total = Math.min(count || candidates.length, candidates.length);
  const step = candidates.length / total;
  const pixelBox = { v: EMPTY_BOX(), word: EMPTY_BOX(), logo: EMPTY_BOX() };
  const chosen = new Uint32Array(total);

  for (let k = 0; k < total; k++) {
    const index = candidates[Math.min(candidates.length - 1, Math.floor(k * step + random() * step))];
    chosen[k] = index;
    const x = index % width;
    const y = (index - x) / width;
    extend(pixelBox.logo, x, y);
    extend(x < split ? pixelBox.v : pixelBox.word, x, y);
  }

  const toUnits = (box) => ({
    minX: (box.minX - width / 2) / height,
    maxX: (box.maxX + 1 - width / 2) / height,
    minY: (height / 2 - (box.maxY + 1)) / height,
    maxY: (height / 2 - box.minY) / height
  });
  const bounds = { v: toUnits(pixelBox.v), word: toUnits(pixelBox.word), logo: toUnits(pixelBox.logo) };
  const centreX = (bounds.logo.minX + bounds.logo.maxX) / 2;
  const centreY = (bounds.logo.minY + bounds.logo.maxY) / 2;
  const shift = (box) => ({ minX: box.minX - centreX, maxX: box.maxX - centreX, minY: box.minY - centreY, maxY: box.maxY - centreY });
  bounds.v = shift(bounds.v);
  bounds.word = shift(bounds.word);
  bounds.logo = shift(bounds.logo);

  const positions = new Float32Array(total * 2);
  const colors = new Float32Array(total * 3);
  const groups = new Float32Array(total);
  const orders = new Float32Array(total);
  const wordSpan = Math.max(1e-6, bounds.word.maxX - bounds.word.minX);

  for (let k = 0; k < total; k++) {
    const index = chosen[k];
    const px = index % width;
    const py = (index - px) / width;
    const x = (px + random() - width / 2) / height - centreX;
    const y = (height / 2 - (py + random())) / height - centreY;
    positions[k * 2] = x;
    positions[k * 2 + 1] = y;
    colors[k * 3] = data[index * 4] / 255;
    colors[k * 3 + 1] = data[index * 4 + 1] / 255;
    colors[k * 3 + 2] = data[index * 4 + 2] / 255;
    const inWord = px >= split;
    groups[k] = inWord ? 1 : 0;
    orders[k] = inWord ? (x - bounds.word.minX) / wordSpan : 0;
  }

  return {
    count: total,
    positions,
    colors,
    groups,
    orders,
    bounds,
    // Average distance between neighbouring particles, used to size the sprites.
    spacing: Math.sqrt(candidates.length / total) / height
  };
}
