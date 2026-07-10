import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./jellyfin/library.service.js', () => ({
  LibraryService: {
    getResumeItems: vi.fn(),
    getMovies: vi.fn(),
    getSeries: vi.fn(),
    getAllMoviesAndSeries: vi.fn(),
    getGenres: vi.fn(),
    getStudios: vi.fn(),
    getLibraryByPublisher: vi.fn()
  }
}));

vi.mock('./tmdb.service.js', () => ({
  TmdbService: {
    getTrending: vi.fn(),
    getPopular: vi.fn()
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
    TmdbService.getTrending.mockResolvedValue([]);
    TmdbService.getPopular.mockResolvedValue([]);
  });

  it('produces one Warner section from two studio variants using the group filter', async () => {
    LibraryService.getStudios.mockResolvedValue([
      { Name: 'Warner Bros. Pictures' },
      { Name: 'Warner Bros. Animation' }
    ]);
    LibraryService.getLibraryByPublisher.mockImplementation((userId, token, type, publisherId) => {
      if (publisherId === 'warner-bros') {
        return Promise.resolve({ items: [item('1'), item('2')], totalRecordCount: 2 });
      }
      return Promise.resolve({ items: [], totalRecordCount: 0 });
    });

    const { sections } = await HomeSectionsService.getHomeSections('u1', 't1');
    const warnerSection = sections.find(s => s.title === 'Warner Bros');

    expect(warnerSection).toBeTruthy();
    expect(warnerSection.href).toBe('#/publisher-group/warner-bros');
    expect(warnerSection.items.map(i => i.Id).sort()).toEqual(['1', '2']);
    expect(LibraryService.getLibraryByPublisher).toHaveBeenCalledWith(
      'u1', 't1', 'Movie,Series', 'warner-bros', null, 1, expect.any(Number)
    );
  });

  it('skips publishers without any items', async () => {
    LibraryService.getStudios.mockResolvedValue([{ Name: 'Netflix' }]);
    LibraryService.getLibraryByPublisher.mockResolvedValue({ items: [], totalRecordCount: 0 });

    const { sections } = await HomeSectionsService.getHomeSections('u1', 't1');

    expect(sections.find(s => s.title === 'Netflix')).toBeUndefined();
  });
});
