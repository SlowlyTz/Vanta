import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/server/services/jellyfin/library.service.js', () => ({
  LibraryService: {
    getResumeItems: vi.fn(),
    getMovies: vi.fn(),
    getSeries: vi.fn(),
    getAllMoviesAndSeries: vi.fn(),
    getGenres: vi.fn(),
    getStudios: vi.fn(),
    getLibraryByStudioNames: vi.fn(),
    getLibraryByPublisher: vi.fn()
  }
}));

vi.mock('../../../src/server/services/tmdb.service.js', () => ({
  TmdbService: {
    getTrending: vi.fn(),
    getPopular: vi.fn(),
    getNowPlaying: vi.fn()
  }
}));

import { LibraryService } from '../../../src/server/services/jellyfin/library.service.js';
import { TmdbService } from '../../../src/server/services/tmdb.service.js';
import { HomeSectionsService } from '../../../src/server/services/home-sections.service.js';
import { isCurrentRelease } from '../../../src/server/services/home-sections/loaders.js';

// A release date `days` from today (negative: in the past).
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function item(id, name = `Item ${id}`) {
  return { Id: id, Name: name, SortName: name };
}

describe('HomeSectionsService._buildPublisherSections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LibraryService.getResumeItems.mockResolvedValue([]);
    LibraryService.getMovies.mockResolvedValue([]);
    LibraryService.getSeries.mockResolvedValue([]);
    LibraryService.getAllMoviesAndSeries.mockResolvedValue([]);
    LibraryService.getGenres.mockResolvedValue([]);
    LibraryService.getLibraryByStudioNames.mockResolvedValue({ items: [], totalRecordCount: 0 });
    TmdbService.getTrending.mockResolvedValue([]);
    TmdbService.getPopular.mockResolvedValue([]);
    TmdbService.getNowPlaying.mockResolvedValue([]);
  });

  it('produces one Warner section from two studio variants using the group filter', async () => {
    LibraryService.getStudios.mockResolvedValue([
      { Name: 'Warner Bros. Pictures' },
      { Name: 'Warner Bros. Animation' }
    ]);
    LibraryService.getLibraryByStudioNames.mockImplementation((userId, token, type, studioNames) => {
      if (studioNames.includes('Warner Bros. Pictures')) {
        return Promise.resolve({ items: [item('1'), item('2')], totalRecordCount: 2 });
      }
      return Promise.resolve({ items: [], totalRecordCount: 0 });
    });

    const sections = await HomeSectionsService._buildPublisherSections('u1', 't1');
    const warnerSection = sections.find(s => s.title === 'Warner Bros');

    expect(warnerSection).toBeTruthy();
    expect(warnerSection.href).toBe('#/publisher-group/warner-bros');
    expect(warnerSection.items.map(i => i.Id).sort()).toEqual(['1', '2']);
    expect(LibraryService.getLibraryByStudioNames).toHaveBeenCalledWith(
      'u1', 't1', 'Movie,Series', ['Warner Bros. Pictures', 'Warner Bros. Animation'], null, 1, expect.any(Number)
    );
  });

  it('skips publishers without any items', async () => {
    LibraryService.getStudios.mockResolvedValue([{ Name: 'Netflix' }]);
    LibraryService.getLibraryByStudioNames.mockResolvedValue({ items: [], totalRecordCount: 0 });

    const sections = await HomeSectionsService._buildPublisherSections('u1', 't1');

    expect(sections.find(s => s.title === 'Netflix')).toBeUndefined();
  });
});

describe('HomeSectionsService._buildGenreSections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links movie-only home genre sections to the movie genre route', async () => {
    LibraryService.getGenres.mockImplementation((userId, token, type) => (
      Promise.resolve(type === 'Movie' ? [{ Name: 'Musik' }] : [])
    ));

    const sections = await HomeSectionsService._buildGenreSections('u1', 't1', [
      { Id: 'm1', Name: 'Movie', Type: 'Movie', Genres: ['Musik'], ProductionYear: 2026 }
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      title: 'Musik',
      href: '#/genre/Movie/Musik'
    });
  });

  it('links series-only home genre sections to the series genre route', async () => {
    LibraryService.getGenres.mockImplementation((userId, token, type) => (
      Promise.resolve(type === 'Series' ? [{ Name: 'Drama' }] : [])
    ));

    const sections = await HomeSectionsService._buildGenreSections('u1', 't1', [
      { Id: 's1', Name: 'Series', Type: 'Series', Genres: ['Drama'], ProductionYear: 2025 }
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      title: 'Drama',
      href: '#/genre/Series/Drama'
    });
  });

  it('links shared home genre sections to the mixed library route', async () => {
    LibraryService.getGenres.mockResolvedValue([{ Name: 'Horror' }]);

    const sections = await HomeSectionsService._buildGenreSections('u1', 't1', [
      { Id: 'm1', Name: 'Movie', Type: 'Movie', Genres: ['Horror'], ProductionYear: 2026 },
      { Id: 's1', Name: 'Series', Type: 'Series', Genres: ['Horror'], ProductionYear: 2025 }
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      title: 'Horror',
      href: '#/genre/Movie,Series/Horror'
    });
  });
});

describe('HomeSectionsService._buildNowPlayingSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LibraryService.getResumeItems.mockResolvedValue([]);
    LibraryService.getMovies.mockResolvedValue([]);
    LibraryService.getSeries.mockResolvedValue([]);
    LibraryService.getGenres.mockResolvedValue([]);
    LibraryService.getStudios.mockResolvedValue([]);
  });

  it('is always returned, empty and without a message (hidden) with zero matches', async () => {
    LibraryService.getAllMoviesAndSeries.mockResolvedValue([]);
    TmdbService.getNowPlaying.mockResolvedValue([
      { id: 999, title: 'Not In Library', mediaType: 'movie', releaseDate: daysFromNow(-10), popularity: 1 }
    ]);

    const [nowPlaying] = await HomeSectionsService.getHomeSectionGroup('now-empty-user', 't1', 'now-playing');

    expect(nowPlaying.title).toBe('Jetzt im Kino');
    expect(nowPlaying.href).toBe('#/movies');
    expect(nowPlaying.items).toEqual([]);
    expect(nowPlaying.emptyMessage).toBeUndefined();
  });

  it('only includes items that actually exist in Jellyfin, not raw TMDB-only hits', async () => {
    const matched = { Id: 'j1', Name: 'In Cinemas', ProviderIds: { Tmdb: '701' } };
    LibraryService.getAllMoviesAndSeries.mockResolvedValue([matched]);
    TmdbService.getNowPlaying.mockResolvedValue([
      { id: 701, title: 'In Cinemas', mediaType: 'movie', releaseDate: daysFromNow(-20), popularity: 5 },
      { id: 702, title: 'Not In Library', mediaType: 'movie', releaseDate: daysFromNow(-5), popularity: 3 }
    ]);

    const [nowPlaying] = await HomeSectionsService.getHomeSectionGroup('now-match-user', 't1', 'now-playing');

    expect(nowPlaying.items).toEqual([matched]);
  });

  it('leaves out re-releases of old films, title look-alikes and old library entries', async () => {
    const cars = { Id: 'cars', Name: 'Cars', ProductionYear: 2006, ProviderIds: { Tmdb: '920' } };
    const panem = { Id: 'panem', Name: 'Die Tribute von Panem', ProductionYear: 2012, ProviderIds: { Tmdb: '70160' } };
    const wrongId = { Id: 'old', Name: 'Neuer Film', ProductionYear: 1999, ProviderIds: { Tmdb: '5000' } };
    const fresh = { Id: 'fresh', Name: 'Frisch', ProductionYear: 2026, ProviderIds: { Tmdb: '6000' } };
    LibraryService.getAllMoviesAndSeries.mockResolvedValue([cars, panem, wrongId, fresh]);
    TmdbService.getNowPlaying.mockResolvedValue([
      { id: 920, title: 'Cars', releaseDate: '2006-06-08' },
      { id: 1111, title: 'Die Tribute von Panem', releaseDate: daysFromNow(-3) },
      { id: 5000, title: 'Neuer Film', releaseDate: daysFromNow(-3) },
      { id: 6000, title: 'Frisch', releaseDate: daysFromNow(-30) }
    ]);

    const [nowPlaying] = await HomeSectionsService.getHomeSectionGroup('now-filter-user', 't1', 'now-playing');

    expect(nowPlaying.items.map(item => item.Id)).toEqual(['fresh']);
  });

  it('counts the last four months and films about to start as current', () => {
    const now = Date.parse('2026-10-12T12:00:00Z');
    expect(isCurrentRelease('2026-09-01', now)).toBe(true);
    expect(isCurrentRelease('2026-11-01', now)).toBe(true);
    expect(isCurrentRelease('2026-05-01', now)).toBe(false);
    expect(isCurrentRelease('2027-06-01', now)).toBe(false);
    expect(isCurrentRelease('', now)).toBe(false);
  });

  it('keeps the home page stable when TMDB now-playing fails, returning an empty items array', async () => {
    LibraryService.getAllMoviesAndSeries.mockResolvedValue([]);
    TmdbService.getNowPlaying.mockRejectedValue(new Error('TMDB down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const [nowPlaying] = await HomeSectionsService.getHomeSectionGroup('now-error-user', 't1', 'now-playing');

    expect(nowPlaying.title).toBe('Jetzt im Kino');
    expect(nowPlaying.items).toEqual([]);
  });
});
