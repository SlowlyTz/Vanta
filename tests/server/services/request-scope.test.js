import { describe, it, expect } from 'vitest';
import {
  formatScopeLabel,
  normalizeScopeSelection,
  toScopeInteger
} from '../../../src/server/services/request-scope.js';

describe('toScopeInteger', () => {
  it('accepts integers and integer strings', () => {
    expect(toScopeInteger(3)).toBe(3);
    expect(toScopeInteger('3')).toBe(3);
    expect(toScopeInteger(' 0 ')).toBe(0);
  });

  it('rejects everything that is not a whole number', () => {
    expect(toScopeInteger(1.5)).toBeNull();
    expect(toScopeInteger('2a')).toBeNull();
    expect(toScopeInteger('')).toBeNull();
    expect(toScopeInteger(null)).toBeNull();
    expect(toScopeInteger(undefined)).toBeNull();
    expect(toScopeInteger(NaN)).toBeNull();
  });
});

describe('normalizeScopeSelection', () => {
  it('defaults to the whole title', () => {
    expect(normalizeScopeSelection({ tmdbType: 'tv' }))
      .toEqual({ scope: 'all', seasonNumber: null, episodeNumber: null });
  });

  it('drops season and episode numbers sent along with scope "all"', () => {
    expect(normalizeScopeSelection({ scope: 'all', tmdbType: 'tv', seasonNumber: 2, episodeNumber: 5 }))
      .toEqual({ scope: 'all', seasonNumber: null, episodeNumber: null });
  });

  it('rejects an unknown scope', () => {
    expect(normalizeScopeSelection({ scope: 'half', tmdbType: 'tv' }).error).toBeTruthy();
  });

  it('rejects any scope other than "all" for a movie', () => {
    expect(normalizeScopeSelection({ scope: 'season', tmdbType: 'movie', seasonNumber: 1 }).error).toBeTruthy();
    expect(normalizeScopeSelection({ scope: 'episode', tmdbType: 'movie', seasonNumber: 1, episodeNumber: 1 }).error).toBeTruthy();
    expect(normalizeScopeSelection({ scope: 'all', tmdbType: 'movie' }).error).toBeUndefined();
  });

  it('requires an integer season for scope "season"', () => {
    expect(normalizeScopeSelection({ scope: 'season', tmdbType: 'tv' }).error).toBeTruthy();
    expect(normalizeScopeSelection({ scope: 'season', tmdbType: 'tv', seasonNumber: 'two' }).error).toBeTruthy();
    expect(normalizeScopeSelection({ scope: 'season', tmdbType: 'tv', seasonNumber: '2' }))
      .toEqual({ scope: 'season', seasonNumber: 2, episodeNumber: null });
  });

  it('requires an integer season and episode for scope "episode"', () => {
    expect(normalizeScopeSelection({ scope: 'episode', tmdbType: 'tv', seasonNumber: 2 }).error).toBeTruthy();
    expect(normalizeScopeSelection({ scope: 'episode', tmdbType: 'tv', episodeNumber: 5 }).error).toBeTruthy();
    expect(normalizeScopeSelection({ scope: 'episode', tmdbType: 'tv', seasonNumber: '2', episodeNumber: '5' }))
      .toEqual({ scope: 'episode', seasonNumber: 2, episodeNumber: 5 });
  });
});

describe('formatScopeLabel', () => {
  it('labels a whole title by media type', () => {
    expect(formatScopeLabel({ request_scope: 'all', tmdb_type: 'tv' })).toBe('Komplette Serie');
    expect(formatScopeLabel({ request_scope: 'all', tmdb_type: 'movie' })).toBe('Ganzer Film');
  });

  it('treats a missing scope as the whole title', () => {
    expect(formatScopeLabel({ tmdb_type: 'tv' })).toBe('Komplette Serie');
  });

  it('labels a season', () => {
    expect(formatScopeLabel({ request_scope: 'season', tmdb_type: 'tv', season_number: 4 })).toBe('Staffel 4');
    expect(formatScopeLabel({ request_scope: 'season', tmdb_type: 'tv', season_number: 12 })).toBe('Staffel 12');
  });

  it('labels an episode zero padded to two digits', () => {
    expect(formatScopeLabel({ request_scope: 'episode', tmdb_type: 'tv', season_number: 1, episode_number: 3 }))
      .toBe('S01E03');
    expect(formatScopeLabel({ request_scope: 'episode', tmdb_type: 'tv', season_number: 10, episode_number: 24 }))
      .toBe('S10E24');
    expect(formatScopeLabel({ request_scope: 'episode', tmdb_type: 'tv', season_number: 1, episode_number: 100 }))
      .toBe('S01E100');
  });
});
