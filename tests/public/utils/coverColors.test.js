import { describe, it, expect } from 'vitest';
import { pickCoverColors } from '../../../src/public/js/utils/coverColors.js';

const pixels = (...groups) => {
  const data = [];
  for (const [count, [r, g, b]] of groups) {
    for (let i = 0; i < count; i += 1) data.push(r, g, b, 255);
  }
  return new Uint8ClampedArray(data);
};

const hue = ([r, g, b]) => (r >= g && r >= b ? 'red' : g >= b ? 'green' : 'blue');

describe('pickCoverColors', () => {
  it('prefers a saturated colour over a larger grey area', () => {
    const colors = pickCoverColors(pixels([600, [120, 120, 120]], [120, [220, 30, 30]]));
    expect(hue(colors.primary)).toBe('red');
  });

  it('picks a second colour of another hue when there is one', () => {
    const colors = pickCoverColors(pixels([300, [200, 40, 40]], [200, [30, 60, 200]], [400, [5, 5, 5]]));
    expect(hue(colors.primary)).toBe('red');
    expect(hue(colors.secondary)).toBe('blue');
  });

  it('darkens bright colours so white text stays readable', () => {
    const colors = pickCoverColors(pixels([500, [255, 240, 120]]));
    expect(Math.max(...colors.primary)).toBeLessThanOrEqual(172);
  });

  it('answers null without opaque pixels', () => {
    expect(pickCoverColors(new Uint8ClampedArray([0, 0, 0, 0]))).toBeNull();
  });
});
