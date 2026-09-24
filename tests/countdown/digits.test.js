import { describe, it, expect } from 'vitest';
import { buildDigitTargets, ensureFont } from '../../src/countdown/src/digits.js';

// A fake glyph: a vertical bar whose height grows with the digit.
function fakeDraw(digit) {
  const size = 20;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 10 - digit; y < 10 + digit; y++) {
    for (let x = 8; x < 12; x++) data.set([255, 255, 255, 255], (y * size + x) * 4);
  }
  return { width: size, height: size, data };
}

describe('buildDigitTargets', () => {
  it('liefert für jede Ziffer gleich viele Punkte in der Anzeigereihenfolge', () => {
    const { targets, height, width, spacing } = buildDigitTargets({ count: 50, draw: fakeDraw, random: () => 0.5 });
    expect(targets.map(target => target.digit)).toEqual([5, 4, 3, 2, 1]);
    expect(targets.every(target => target.positions.length === 100)).toBe(true);
    // The tallest glyph (5 → 10 px of 20) sets the height.
    expect(height).toBeCloseTo(0.5);
    // All fake glyphs are 4 px wide in a 20 px bitmap.
    expect(width).toBeCloseTo(0.2);
    expect(spacing).toBeGreaterThan(0);
  });
});

describe('ensureFont', () => {
  it('wartet nicht ewig auf die Schrift', async () => {
    const started = Date.now();
    await ensureFont({ load: () => new Promise(() => {}) });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('kommt ohne Font-API aus', async () => {
    await expect(ensureFont(undefined)).resolves.toBeUndefined();
  });
});
