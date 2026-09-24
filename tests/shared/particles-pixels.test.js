import { describe, it, expect } from 'vitest';
import { samplePixels, sortByAngle } from '../../src/shared/particles/pixels.js';

// Builds an RGBA bitmap from rows of '#' (opaque) and '.' (clear).
function bitmap(rows) {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === '#') data.set([255, 255, 255, 255], (y * width + x) * 4);
  }));
  return { width, height, data };
}

const fixedRandom = () => 0.5;

describe('samplePixels', () => {
  const square = bitmap([
    '......',
    '.####.',
    '.####.',
    '.####.',
    '.####.',
    '......'
  ]);

  it('liefert genau die gewünschte Anzahl, auch mehr Punkte als Pixel', () => {
    expect(samplePixels(square, { count: 5, random: fixedRandom }).count).toBe(5);
    const many = samplePixels(square, { count: 64, random: fixedRandom });
    expect(many.count).toBe(64);
    expect(many.positions).toHaveLength(128);
  });

  it('zentriert die bemalte Fläche im Ursprung in Einheiten der Bildhöhe', () => {
    const { bounds, positions } = samplePixels(square, { count: 16, random: fixedRandom });
    // A 4 px square in a 6 px high bitmap spans ±2/6 around the centre.
    expect(bounds.minX).toBeCloseTo(-1 / 3);
    expect(bounds.maxX).toBeCloseTo(1 / 3);
    expect(bounds.minY).toBeCloseTo(-1 / 3);
    expect(bounds.maxY).toBeCloseTo(1 / 3);
    for (let i = 0; i < positions.length; i += 2) {
      expect(Math.abs(positions[i])).toBeLessThanOrEqual(bounds.maxX + 1e-6);
      expect(Math.abs(positions[i + 1])).toBeLessThanOrEqual(bounds.maxY + 1e-6);
    }
  });

  it('hält oben im Bild auch oben in der Szene', () => {
    const topOnly = bitmap(['##', '..', '..', '..']);
    const { positions } = samplePixels(topOnly, { count: 2, random: fixedRandom });
    const shifted = samplePixels(bitmap(['##', '..', '..', '##']), { count: 4, random: fixedRandom });
    expect(positions[1]).toBeCloseTo(0);
    expect(shifted.positions[1]).toBeGreaterThan(0);
    expect(shifted.positions[7]).toBeLessThan(0);
  });

  it('ignoriert schwache Kantenpixel und kommt mit leeren Bildern zurecht', () => {
    const faint = { width: 1, height: 1, data: new Uint8ClampedArray([255, 255, 255, 20]) };
    expect(samplePixels(faint, { count: 3 }).spacing).toBe(0);
    expect(samplePixels(faint, { count: 3 }).count).toBe(3);
  });
});

describe('sortByAngle', () => {
  it('ordnet Punkte gegen den Uhrzeigersinn ab der negativen x-Achse', () => {
    const sorted = sortByAngle(new Float32Array([1, 0, 0, 1, -1, 0.0001, 0, -1]));
    // atan2 order: (0,-1) = -90°, (1,0) = 0°, (0,1) = 90°, (-1,+) ≈ 180°
    expect([...sorted]).toEqual([0, -1, 1, 0, 0, 1, -1, expect.closeTo(0.0001, 6)]);
  });
});
