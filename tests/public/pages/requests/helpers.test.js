import { describe, it, expect } from 'vitest';
import {
  getScopeLabel,
  mergeSeasons,
  buildRequestCoverage,
  isScopeCovered,
  addScopeToCoverage
} from '../../../../src/public/js/pages/requests/helpers.js';

describe('getScopeLabel', () => {
  it('labels a whole series and a whole movie', () => {
    expect(getScopeLabel({ request_scope: 'all', tmdb_type: 'tv' })).toBe('Komplette Serie');
    expect(getScopeLabel({ request_scope: 'all', tmdb_type: 'movie' })).toBe('Ganzer Film');
  });

  it('defaults to the whole-title label when no scope is stored', () => {
    expect(getScopeLabel({ tmdb_type: 'tv' })).toBe('Komplette Serie');
    expect(getScopeLabel({ tmdb_type: 'movie' })).toBe('Ganzer Film');
  });

  it('labels a season', () => {
    expect(getScopeLabel({ request_scope: 'season', tmdb_type: 'tv', season_number: 2 })).toBe('Staffel 2');
    expect(getScopeLabel({ scope: 'season', seasonNumber: 11 })).toBe('Staffel 11');
  });

  it('labels an episode zero padded to two digits', () => {
    expect(getScopeLabel({ request_scope: 'episode', season_number: 1, episode_number: 3 })).toBe('S01E03');
    expect(getScopeLabel({ scope: 'episode', seasonNumber: 12, episodeNumber: 10 })).toBe('S12E10');
  });

  it('falls back to the whole-title label when the numbers are missing', () => {
    expect(getScopeLabel({ request_scope: 'season', tmdb_type: 'tv' })).toBe('Komplette Serie');
    expect(getScopeLabel({ request_scope: 'episode', season_number: 1, tmdb_type: 'tv' })).toBe('Komplette Serie');
  });
});

describe('mergeSeasons', () => {
  const tmdbSeasons = [
    { season_number: 0, name: 'Specials', episode_count: 3, poster_path: '/s0.jpg' },
    { season_number: 1, name: 'Staffel 1', episode_count: 10, poster_path: '/s1.jpg' },
    { season_number: 2, name: 'Staffel 2', episode_count: 8, poster_path: '/s2.jpg' }
  ];

  it('marks every season requestable except specials when no cross-check ran', () => {
    const merged = mergeSeasons(tmdbSeasons, []);

    expect(merged.map(s => s.season_number)).toEqual([0, 1, 2]);
    expect(merged[0]).toMatchObject({ special: true, requestable: false, exists: false });
    expect(merged[1]).toMatchObject({ special: false, requestable: true, exists: false, poster_path: '/s1.jpg' });
  });

  it('trusts requestable and exists from the cross-check shape', () => {
    const merged = mergeSeasons(tmdbSeasons, [
      { season_number: 0, name: 'Specials', exists: false, episode_count: 3, requestable: false, reason: 'special' },
      { season_number: 1, name: 'Staffel 1', exists: true, jellyfin_season_id: 'jf-1', episode_count: 10, requestable: false },
      { season_number: 2, name: 'Staffel 2', exists: false, jellyfin_season_id: null, episode_count: 8, requestable: true }
    ]);

    expect(merged[1]).toMatchObject({ exists: true, requestable: false });
    expect(merged[2]).toMatchObject({ exists: false, requestable: true, poster_path: '/s2.jpg' });
  });

  it('falls back to the cross-check list when TMDB has no seasons and sorts by number', () => {
    const merged = mergeSeasons([], [
      { season_number: 2, name: 'Staffel 2', exists: false, episode_count: 8, requestable: true },
      { season_number: 1, name: 'Staffel 1', exists: true, episode_count: 10, requestable: false }
    ]);

    expect(merged.map(s => s.season_number)).toEqual([1, 2]);
    expect(merged[0].poster_path).toBeNull();
  });
});

describe('request coverage', () => {
  const rows = [
    { tmdb_id: 42, tmdb_type: 'tv', request_scope: 'season', season_number: 1, status: 'pending' },
    { tmdb_id: 42, tmdb_type: 'tv', request_scope: 'episode', season_number: 2, episode_number: 4, status: 'approved' },
    { tmdb_id: 42, tmdb_type: 'tv', request_scope: 'all', status: 'rejected' },
    { tmdb_id: 99, tmdb_type: 'tv', request_scope: 'all', status: 'pending' }
  ];

  it('ignores rejected rows and rows of other titles', () => {
    const coverage = buildRequestCoverage(rows, 42, 'tv');

    expect(coverage.all).toBe(false);
    expect(isScopeCovered(coverage, { scope: 'season', seasonNumber: 1 })).toBe(true);
    expect(isScopeCovered(coverage, { scope: 'season', seasonNumber: 2 })).toBe(false);
    expect(isScopeCovered(coverage, { scope: 'episode', seasonNumber: 2, episodeNumber: 4 })).toBe(true);
    expect(isScopeCovered(coverage, { scope: 'episode', seasonNumber: 2, episodeNumber: 5 })).toBe(false);
  });

  it('lets a season row cover every episode inside it', () => {
    const coverage = buildRequestCoverage(rows, 42, 'tv');
    expect(isScopeCovered(coverage, { scope: 'episode', seasonNumber: 1, episodeNumber: 7 })).toBe(true);
  });

  it('lets an all row cover every scope', () => {
    const coverage = buildRequestCoverage([{ tmdb_id: 42, tmdb_type: 'tv', request_scope: 'all', status: 'pending' }], 42, 'tv');

    expect(isScopeCovered(coverage, { scope: 'all' })).toBe(true);
    expect(isScopeCovered(coverage, { scope: 'season', seasonNumber: 3 })).toBe(true);
    expect(isScopeCovered(coverage, { scope: 'episode', seasonNumber: 3, episodeNumber: 1 })).toBe(true);
  });

  it('treats a row without a scope as a whole-title request', () => {
    const coverage = buildRequestCoverage([{ tmdb_id: 7, tmdb_type: 'movie', status: 'pending' }], 7, 'movie');
    expect(coverage.all).toBe(true);
  });

  it('adds a freshly created scope to the coverage', () => {
    const coverage = buildRequestCoverage([]);

    addScopeToCoverage(coverage, { scope: 'season', seasonNumber: 5 });
    expect(isScopeCovered(coverage, { scope: 'season', seasonNumber: 5 })).toBe(true);

    addScopeToCoverage(coverage, { scope: 'episode', seasonNumber: 6, episodeNumber: 2 });
    expect(isScopeCovered(coverage, { scope: 'episode', seasonNumber: 6, episodeNumber: 2 })).toBe(true);
  });
});
