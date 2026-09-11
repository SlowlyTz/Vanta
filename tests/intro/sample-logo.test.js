import { describe, it, expect } from 'vitest';
import { findSplitColumn, sampleLogo } from '../../src/intro/src/sample-logo.js';

// A 20x4 bitmap: a red block in columns 1-5 and a blue block in columns 10-17,
// separated by empty columns — the same shape as the V and the word.
function bitmap() {
  const width = 20;
  const height = 4;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (x >= 1 && x <= 5) data.set([255, 0, 0, 255], i);
      else if (x >= 10 && x <= 17) data.set([0, 0, 255, 200], i);
    }
  }
  return { width, height, data };
}

describe('findSplitColumn', () => {
  it('returns the column after the first gap behind the first painted run', () => {
    expect(findSplitColumn([0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1])).toBe(5);
  });

  it('ignores gaps narrower than the minimum', () => {
    expect(findSplitColumn([1, 1, 0, 1, 1, 0, 0, 0, 1], 2)).toBe(8);
  });

  it('ignores leading and trailing empty columns', () => {
    expect(findSplitColumn([0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0])).toBe(6);
  });

  it('puts everything into the first group without a gap', () => {
    expect(findSplitColumn([1, 1, 1])).toBe(3);
  });
});

describe('sampleLogo', () => {
  const seeded = () => {
    let s = 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  };

  it('keeps every opaque pixel when no count is given', () => {
    const sample = sampleLogo(bitmap(), { random: seeded() });
    expect(sample.count).toBe(5 * 4 + 8 * 4);
  });

  it('subsamples evenly to the requested count', () => {
    const sample = sampleLogo(bitmap(), { count: 13, random: seeded() });
    expect(sample.count).toBe(13);
    const inWord = Array.from(sample.groups).filter(g => g === 1).length;
    // 8 of 13 columns are the word, so roughly 8/13 of the particles.
    expect(inWord).toBeGreaterThanOrEqual(6);
    expect(inWord).toBeLessThanOrEqual(10);
  });

  it('splits the V from the word and orders the word left to right', () => {
    const sample = sampleLogo(bitmap(), { random: seeded() });
    for (let i = 0; i < sample.count; i++) {
      const x = sample.positions[i * 2];
      if (sample.groups[i] === 0) {
        expect(sample.colors[i * 3]).toBe(1);
        expect(x).toBeLessThan(sample.bounds.word.minX);
        expect(sample.orders[i]).toBe(0);
      } else {
        expect(sample.colors[i * 3 + 2]).toBe(1);
        expect(sample.orders[i]).toBeGreaterThanOrEqual(0);
        expect(sample.orders[i]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('centres the logo at the origin in units of the bitmap height', () => {
    const sample = sampleLogo(bitmap(), { random: seeded() });
    expect(sample.bounds.logo.minX).toBeCloseTo(-sample.bounds.logo.maxX, 5);
    expect(sample.bounds.logo.maxY - sample.bounds.logo.minY).toBeCloseTo(1, 5);
    expect(sample.bounds.logo.maxX - sample.bounds.logo.minX).toBeCloseTo(17 / 4, 5);
    expect(sample.bounds.v.maxX).toBeLessThan(sample.bounds.word.minX);
  });

  it('ignores faint edge pixels', () => {
    const image = bitmap();
    image.data[3] = 20;
    image.data[0] = 9;
    const sample = sampleLogo(image, { random: seeded() });
    expect(sample.count).toBe(5 * 4 + 8 * 4);
  });
});
