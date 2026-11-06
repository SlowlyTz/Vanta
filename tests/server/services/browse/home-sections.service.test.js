import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/server/services/browse/library.service.js', () => ({
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

vi.mock('../../../../src/server/services/tmdb.service.js', () => ({
  TmdbService: {
    getTrending: vi.fn(),
    getTrendingByType: vi.fn(),
    getPopular: vi.fn(),
    getNowPlaying: vi.fn()
  }
}));

vi.mock('../../../../src/server/services/browse/title-extras.service.js', () => ({ lastWatchedTitle: vi.fn() }));
vi.mock('../../../../src/server/services/browse/title-copies.js', () => ({ firstCopiesOnly: vi.fn(async (userId, token, items) => items) }));
vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({ ItemsService: { getSimilarItems: vi.fn() } }));

import { LibraryService } from '../../../../src/server/services/browse/library.service.js';
import { lastWatchedTitle } from '../../../../src/server/services/browse/title-extras.service.js';
import { ItemsService } from '../../../../src/server/services/jellyfin/items.service.js';
import { TmdbService } from '../../../../src/server/services/tmdb.service.js';
import { HomeSectionsService } from '../../../../src/server/services/browse/home-sections.service.js';
import { buildBecauseYouWatched, buildGenreSections, buildNowPlayingSection, buildPublisherSections, buildTopTenSections, isCurrentRelease } from '../../../../src/server/services/browse/home-sections/loaders.js';

// A release date `days` from today (negative: in the past).
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function item(id, name = `Item ${id}`) {
  return { Id: id, Name: name, SortName: name };
}

describe('buildPublisherSections', () => {
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

    const sections = await buildPublisherSections('u1', 't1');
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

    const sections = await buildPublisherSections('u1', 't1');

    expect(sections.find(s => s.title === 'Netflix')).toBeUndefined();
  });
});

describe('buildGenreSections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // A home row needs at least four titles.
  const four = (type, genre, year) => Array.from({ length: 4 }, (_, i) => ({ Id: `${type}-${i}`, Name: type, Type: type, Genres: [genre], ProductionYear: year }));

  it('links movie-only home genre sections to the movie genre route', async () => {
    LibraryService.getGenres.mockImplementation((userId, token, type) => (
      Promise.resolve(type === 'Movie' ? [{ Name: 'Musik' }] : [])
    ));

    const sections = await buildGenreSections('u1', 't1', four('Movie', 'Musik', 2026));

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

    const sections = await buildGenreSections('u1', 't1', four('Series', 'Drama', 2025));

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      title: 'Drama',
      href: '#/genre/Series/Drama'
    });
  });

  it('links shared home genre sections to the mixed library route', async () => {
    LibraryService.getGenres.mockResolvedValue([{ Name: 'Horror' }]);

    const sections = await buildGenreSections('u1', 't1', [...four('Movie', 'Horror', 2026), ...four('Series', 'Horror', 2025)]);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      title: 'Horror',
      href: '#/genre/Movie,Series/Horror'
    });
  });

  it('leaves out rows with too few titles and names English genres in German', async () => {
    LibraryService.getGenres.mockImplementation((userId, token, type) => (
      Promise.resolve(type === 'Series' ? [{ Name: 'War & Politics' }, { Name: 'Reality' }] : [])
    ));

    const sections = await buildGenreSections('u1', 't1', [
      ...four('Series', 'War & Politics', 2024),
      { Id: 'r1', Name: 'Show', Type: 'Series', Genres: ['Reality'], ProductionYear: 2024 }
    ]);

    expect(sections.map(section => section.title)).toEqual(['Krieg & Politik']);
  });
});

describe('buildNowPlayingSection', () => {
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

describe('buildTopTenSections', () => {
  const film = (id, tmdb) => ({ Id: id, Name: id, Type: 'Movie', ProviderIds: { Tmdb: String(tmdb) } });
  const show = (id, tmdb) => ({ Id: id, Name: id, Type: 'Series', ProviderIds: { Tmdb: String(tmdb) } });
  const chart = (mediaType, ...ids) => ids.map(id => ({ id, mediaType, title: `t${id}` }));

  beforeEach(() => {
    vi.clearAllMocks();
    TmdbService.getPopular.mockResolvedValue([]);
  });

  it('ranks by the chart of the day and tops up from the week, per type', async () => {
    const library = [film('a', 1), film('b', 2), film('c', 3), film('d', 4), show('s', 2)];
    TmdbService.getTrendingByType.mockImplementation(async (mediaType, window) => {
      if (mediaType === 'movie') return window === 'day' ? chart('movie', 3, 99, 1) : chart('movie', 1, 4, 2);
      return chart('tv', 2);
    });

    const sections = await buildTopTenSections(library);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ type: 'top10', title: 'Top 4 Filme heute' });
    expect(sections[0].items.map(entry => entry.Id)).toEqual(['c', 'a', 'd', 'b']);
  });

  it('never matches a series to a film with the same TMDB id', async () => {
    const library = [film('film-7', 7), show('show-7', 7), show('show-8', 8), show('show-9', 9)];
    TmdbService.getTrendingByType.mockImplementation(async (mediaType) => (mediaType === 'tv' ? chart('tv', 7, 8, 9) : []));

    const [series] = await buildTopTenSections(library);
    expect(series.items.map(entry => entry.Id)).toEqual(['show-7', 'show-8', 'show-9']);
  });

  it('builds only the rows asked for', async () => {
    const library = [show('s1', 1), show('s2', 2), show('s3', 3), film('f1', 1), film('f2', 2), film('f3', 3)];
    TmdbService.getTrendingByType.mockImplementation(async (mediaType) => chart(mediaType, 1, 2, 3));
    const sections = await buildTopTenSections(library, { types: ['Series'] });
    expect(sections.map(section => section.title)).toEqual(['Top 3 Serien heute']);
    expect(TmdbService.getTrendingByType).not.toHaveBeenCalledWith('movie', expect.anything());
  });

  it('leaves out a row a chart outage leaves empty', async () => {
    TmdbService.getTrendingByType.mockRejectedValue(new Error('down'));
    expect(await buildTopTenSections([film('a', 1)])).toEqual([]);
  });
});

describe('buildBecauseYouWatched', () => {
  beforeEach(() => vi.clearAllMocks());

  it('names the title watched last and leaves out what was watched', async () => {
    lastWatchedTitle.mockResolvedValue({ id: 's1', name: 'Alice' });
    ItemsService.getSimilarItems.mockResolvedValue([
      item('a'), item('s1'), { ...item('b'), UserData: { Played: true } }, item('c'), item('d'), item('e')
    ]);
    const section = await buildBecauseYouWatched('u', 't');
    expect(section.title).toBe('Weil du \u201EAlice\u201C geschaut hast');
    expect(section.items.map(entry => entry.Id)).toEqual(['a', 'c', 'd', 'e']);
  });

  it('is left out without a watched title or with too few similar ones', async () => {
    lastWatchedTitle.mockResolvedValue(null);
    expect(await buildBecauseYouWatched('u', 't')).toBeNull();
    lastWatchedTitle.mockResolvedValue({ id: 's1', name: 'Alice' });
    ItemsService.getSimilarItems.mockResolvedValue([item('a'), item('b')]);
    expect(await buildBecauseYouWatched('u', 't')).toBeNull();
  });
});
