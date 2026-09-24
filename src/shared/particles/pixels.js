// Turning bitmaps into particle targets. Positions come out in units of the
// bitmap height with the origin at the centre of the painted area.

export function readPixels(source, width) {
  const sourceWidth = source.naturalWidth || source.width;
  const sourceHeight = source.naturalHeight || source.height;
  const height = Math.round(sourceHeight * (width / sourceWidth));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(source, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

// Picks exactly `count` points spread evenly over the painted pixels, reusing
// pixels when there are fewer than `count` of them. Morphing between shapes
// needs every shape to have the same number of points.
export function samplePixels(image, { count, random = Math.random, alphaThreshold = 40 } = {}) {
  const { width, height, data } = image;
  const candidates = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaThreshold) {
        candidates.push(y * width + x);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const total = Math.max(0, Math.round(count ?? candidates.length));
  const positions = new Float32Array(total * 2);
  if (!candidates.length || !total) {
    return { count: total, positions, bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }, spacing: 0 };
  }

  const centreX = (minX + maxX + 1) / 2;
  const centreY = (minY + maxY + 1) / 2;
  const step = candidates.length / total;

  for (let k = 0; k < total; k++) {
    const index = candidates[Math.min(candidates.length - 1, Math.floor(k * step + random() * step))];
    const px = index % width;
    const py = (index - px) / width;
    positions[k * 2] = (px + random() - centreX) / height;
    positions[k * 2 + 1] = (centreY - (py + random())) / height;
  }

  return {
    count: total,
    positions,
    bounds: {
      minX: (minX - centreX) / height,
      maxX: (maxX + 1 - centreX) / height,
      minY: (centreY - (maxY + 1)) / height,
      maxY: (centreY - minY) / height
    },
    // Average distance between neighbouring points, used to size the sprites.
    spacing: Math.sqrt(candidates.length / Math.max(total, candidates.length)) / height
  };
}

// Reorders points by their angle around the centre, so point i of one shape
// and point i of the next lie in roughly the same direction and a morph
// between them travels short, calm paths instead of criss-crossing.
export function sortByAngle(positions) {
  const count = positions.length / 2;
  const order = Array.from({ length: count }, (_, i) => i);
  const angle = i => Math.atan2(positions[i * 2 + 1], positions[i * 2]);
  const radius = i => Math.hypot(positions[i * 2], positions[i * 2 + 1]);
  order.sort((a, b) => angle(a) - angle(b) || radius(a) - radius(b));
  const sorted = new Float32Array(positions.length);
  order.forEach((from, to) => {
    sorted[to * 2] = positions[from * 2];
    sorted[to * 2 + 1] = positions[from * 2 + 1];
  });
  return sorted;
}
