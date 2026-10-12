import { describe, it, expect } from 'vitest';
import { normalizeForSearch, editDistance, scoreText, ageRating, rankEntries, rankPeople } from '../../../../src/server/services/catalog/search.js';

const entry = (id, name, extra = {}) => ({
  id, type: 'Movie', libraryId: 'lib', name: normalizeForSearch(name), original: '', year: 2010, age: 12,
  genres: new Set(), people: [], rating: 0, ...extra
});

describe('normalizeForSearch', () => {
  it('drops case, accents, umlauts and punctuation', () => {
    expect(normalizeForSearch('Amélie: Die fabelhafte Welt')).toBe('amelie die fabelhafte welt');
    expect(normalizeForSearch('Die Ärzte – Straße')).toBe('die arzte strasse');
  });
});

describe('editDistance', () => {
  it('counts a swap of neighbours as one edit', () => {
    expect(editDistance('brekaing', 'breaking')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('abc', 'xyz', 1)).toBe(2);
  });
});

describe('scoreText', () => {
  it('ranks exact > prefix > word start > contains > typo', () => {
    const scores = ['dark', 'darkness', 'the dark knight', 'undarker', 'drak'].map(text => scoreText('dark', text));
    expect(scores).toEqual([100, 90, 80, 60, 30]);
    expect(scoreText('brekaing bad', 'breaking bad')).toBe(30);
    expect(scoreText('xyz', 'breaking bad')).toBe(0);
    // Short queries must match literally.
    expect(scoreText('drk', 'dark')).toBe(0);
  });
});

describe('ageRating', () => {
  it('reads German and US ratings', () => {
    expect(['FSK-12', 'FSK-0', '16', 'DE-6', 'R', 'TV-MA', 'M18', 'PG-13', 'XYZ', null].map(ageRating))
      .toEqual([12, 0, 16, 6, 16, 18, 18, 12, null, null]);
  });
});

describe('rankEntries', () => {
  const entries = [
    entry('bb', 'Breaking Bad', { type: 'Series', year: 2008, age: 16, genres: new Set(['drama']) }),
    entry('bh', 'Breakout', { year: 2015, age: 12 }),
    entry('h', 'Heat', { year: 1995, age: 16, people: [{ id: 'p1', name: 'al pacino', displayName: 'Al Pacino' }] }),
    entry('k', 'Kids', { libraryId: 'kids', age: 0, genres: new Set(['animation']) })
  ];

  it('finds a title despite a typo and sorts by match', () => {
    expect(rankEntries(entries, { query: 'Brekaing Bad' })).toEqual(['bb']);
    expect(rankEntries(entries, { query: 'break' })).toEqual(['bb', 'bh']);
  });

  it('finds titles through a person in them', () => {
    expect(rankEntries(entries, { query: 'pacino' })).toEqual(['h']);
    expect(rankEntries(entries, { query: 'pacnio' })).toEqual(['h']);
  });

  it('applies library access and filters', () => {
    expect(rankEntries(entries, { libraryIds: ['lib'] })).not.toContain('k');
    expect(rankEntries(entries, { filters: { types: ['Series'] } })).toEqual(['bb']);
    expect(rankEntries(entries, { filters: { genres: ['Drama'] } })).toEqual(['bb']);
    expect(rankEntries(entries, { filters: { decade: 1990 } })).toEqual(['h']);
    expect(rankEntries(entries, { filters: { maxAge: 12 } }).sort()).toEqual(['bh', 'k']);
  });
});

describe('rankPeople', () => {
  it('lists each matching person once', () => {
    const people = [{ id: 'p1', name: 'al pacino', displayName: 'Al Pacino', imageTag: 't' }];
    const entries = [entry('a', 'A', { people }), entry('b', 'B', { people })];
    expect(rankPeople(entries, { query: 'Pacin' })).toEqual([{ Id: 'p1', Name: 'Al Pacino', PrimaryImageTag: 't' }]);
    expect(rankPeople(entries, { query: 'al' })).toEqual([]);
    expect(rankPeople(entries, { query: 'Paccino' }).map(p => p.Name)).toEqual(['Al Pacino']);
  });
});
