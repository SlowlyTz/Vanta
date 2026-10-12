import { describe, it, expect } from 'vitest';
import { createIdleCarry } from '../../../src/public/js/utils/stillWatchingCarry.js';

const memoryStorage = () => {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
};

describe('createIdleCarry', () => {
  it('hands the count to the next player page once', () => {
    const storage = memoryStorage();
    createIdleCarry({ storage, now: () => 1000 }).give(5000);
    const next = createIdleCarry({ storage, now: () => 2000 });
    expect(next.take()).toBe(5000);
    expect(next.take()).toBe(0);
  });

  it('ignores a stale value', () => {
    const storage = memoryStorage();
    createIdleCarry({ storage, now: () => 0 }).give(5000);
    expect(createIdleCarry({ storage, now: () => 120_000 }).take()).toBe(0);
  });
});
