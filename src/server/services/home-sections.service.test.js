import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./jellyfin/library.service.js', () => ({
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

vi.mock('./tmdb.service.js', () => ({
  TmdbService: {
    getTrending: vi.fn(),
    getPopular: vi.fn(),
    getNowPlaying: vi.fn()
  }
}));

import { LibraryService } from './jellyfin/library.service.js';
import { TmdbService } from './tmdb.service.js';
import { HomeSectionsService } from './home-sections.service.js';

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

    const { sections } = await HomeSectionsService.getHomeSections('u1', 't1');
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

    const { sections } = await HomeSectionsService.getHomeSections('u1', 't1');

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

  it('is always returned as the first section, even with zero matches', async () => {
    LibraryService.getAllMoviesAndSeries.mockResolvedValue([]);
    TmdbService.getNowPlaying.mockResolvedValue([
      { id: 999, title: 'Not In Library', mediaType: 'movie', releaseDate: '2026-01-01', popularity: 1 }
    ]);

    const { sections } = await HomeSectionsService.getHomeSections('now-empty-user', 't1');
    const nowPlaying = sections[0];

    expect(nowPlaying.title).toBe('Jetzt im Kino');
    expect(nowPlaying.href).toBe('#/movies');
    expect(nowPlaying.items).toEqual([]);
    expect(nowPlaying.emptyMessage).toBeTruthy();
  });

  it('only includes items that actually exist in Jellyfin, not raw TMDB-only hits', async () => {
    const matched = { Id: 'j1', Name: 'In Cinemas', ProviderIds: { Tmdb: '701' } };
    LibraryService.getAllMoviesAndSeries.mockResolvedValue([matched]);
    TmdbService.getNowPlaying.mockResolvedValue([
      { id: 701, title: 'In Cinemas', mediaType: 'movie', releaseDate: '2026-01-01', popularity: 5 },
      { id: 702, title: 'Not In Library', mediaType: 'movie', releaseDate: '2026-01-02', popularity: 3 }
    ]);

    const { sections } = await HomeSectionsService.getHomeSections('now-match-user', 't1');
    const nowPlaying = sections[0];

    expect(nowPlaying.items).toEqual([matched]);
  });

  it('keeps the home page stable when TMDB now-playing fails, returning an empty items array', async () => {
    LibraryService.getAllMoviesAndSeries.mockResolvedValue([]);
    TmdbService.getNowPlaying.mockRejectedValue(new Error('TMDB down'));

    const { sections } = await HomeSectionsService.getHomeSections('now-error-user', 't1');
    const nowPlaying = sections[0];

    expect(nowPlaying.title).toBe('Jetzt im Kino');
    expect(nowPlaying.items).toEqual([]);
    expect(nowPlaying.emptyMessage).toBeTruthy();
  });
});
