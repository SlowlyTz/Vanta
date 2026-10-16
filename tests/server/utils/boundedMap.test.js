import { describe, it, expect } from 'vitest';
import { setBounded } from '../../../src/server/utils/boundedMap.js';

describe('setBounded', () => {
  it('drops expired entries first, then the oldest, once the map is full', () => {
    const map = new Map([['a', { old: true }], ['b', { old: false }], ['c', { old: false }]]);
    setBounded(map, 'd', { old: false }, { max: 3, isExpired: entry => entry.old });
    expect([...map.keys()]).toEqual(['b', 'c', 'd']);

    setBounded(map, 'e', { old: false }, { max: 3, isExpired: entry => entry.old });
    expect([...map.keys()]).toEqual(['c', 'd', 'e']);
  });

  it('replacing a key never evicts anything', () => {
    const map = new Map([['a', 1], ['b', 2]]);
    setBounded(map, 'a', 3, { max: 2 });
    expect([...map.entries()]).toEqual([['a', 3], ['b', 2]]);
  });
});
