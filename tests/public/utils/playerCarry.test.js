import { describe, it, expect } from 'vitest';
import { createPlayerCarry, sleepForNextEpisode } from '../../../src/public/js/utils/playerCarry.js';

const memoryStorage = () => {
  const data = new Map();
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
};

describe('createPlayerCarry', () => {
  it('hands the state to the next player page once', () => {
    const storage = memoryStorage();
    createPlayerCarry({ storage, now: () => 1000 }).give({ idleMs: 5000, sleep: { mode: 'end' }, originId: 's1' });
    const next = createPlayerCarry({ storage, now: () => 2000 });
    expect(next.take()).toEqual({ idleMs: 5000, sleep: { mode: 'end' }, originId: 's1' });
    expect(next.take()).toEqual({});
  });

  it('ignores a stale value', () => {
    const storage = memoryStorage();
    createPlayerCarry({ storage, now: () => 0 }).give({ idleMs: 5000 });
    expect(createPlayerCarry({ storage, now: () => 120_000 }).take()).toEqual({});
  });
});

describe('sleepForNextEpisode', () => {
  it('drops "bis zum Ende" for an episode picked by hand, keeps a set time', () => {
    expect(sleepForNextEpisode({ mode: 'end' }, { manual: true })).toBeNull();
    expect(sleepForNextEpisode({ mode: 'end' })).toEqual({ mode: 'end' });
    expect(sleepForNextEpisode({ mode: 'duration', remainingMs: 5000 }, { manual: true })).toEqual({ mode: 'duration', remainingMs: 5000 });
    expect(sleepForNextEpisode(null, { manual: true })).toBeNull();
  });
});
