import { describe, it, expect, beforeEach } from 'vitest';
import { recentSearches, MAX_RECENT_SEARCHES } from '../../../src/public/js/utils/recentSearches.js';

describe('recentSearches', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the newest first, each once, at most ten', () => {
    for (let i = 0; i < 12; i++) recentSearches.add(`q${i}`);
    recentSearches.add('Q5');
    const list = recentSearches.list();
    expect(list).toHaveLength(MAX_RECENT_SEARCHES);
    expect(list[0]).toBe('Q5');
    expect(list.filter(entry => entry.toLowerCase() === 'q5')).toHaveLength(1);
  });

  it('removes one or all', () => {
    recentSearches.add('a');
    recentSearches.add('b');
    expect(recentSearches.remove('a')).toEqual(['b']);
    expect(recentSearches.clear()).toEqual([]);
    expect(recentSearches.add('  ')).toEqual([]);
  });
});
