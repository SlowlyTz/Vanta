import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./jellyfin/library.service.js', () => ({
  LibraryService: {
    getGenres: vi.fn(),
    getStudios: vi.fn(),
    getLibrary: vi.fn(),
    getLibraryByPublisher: vi.fn()
  }
}));

import { LibraryService } from './jellyfin/library.service.js';
import { HomeCategoriesService } from './home-categories.service.js';

function item(id, name = `Item ${id}`) {
  return { Id: id, Name: name };
}

describe('HomeCategoriesService._buildPublisherCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LibraryService.getGenres.mockResolvedValue([]);
  });

  it('builds one category per featured publisher using the group filter, merging two Warner studio variants', async () => {
    LibraryService.getStudios.mockResolvedValue([
      { Name: 'Warner Bros. Pictures' },
      { Name: 'Warner Bros. Animation' },
      { Name: 'Some Indie Studio' }
    ]);
    LibraryService.getLibraryByPublisher.mockImplementation((userId, token, type, publisherId) => {
      if (publisherId === 'warner-bros') {
        return Promise.resolve({ items: [item('1'), item('2')], totalRecordCount: 2 });
      }
      return Promise.resolve({ items: [], totalRecordCount: 0 });
    });

    const categories = await HomeCategoriesService.getHomeCategories('u1', 't1');

    expect(categories.publishers).toHaveLength(1);
    expect(categories.publishers[0]).toMatchObject({
      name: 'Warner Bros',
      publisherId: 'warner-bros',
      href: '#/publisher-group/warner-bros'
    });
    expect(LibraryService.getLibraryByPublisher).toHaveBeenCalledWith(
      'u1', 't1', 'Movie,Series', 'warner-bros', null, 1, expect.any(Number)
    );
    expect(LibraryService.getLibrary).not.toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.anything(), expect.anything(), 'Warner Bros. Pictures', expect.anything(), expect.anything()
    );
  });

  it('omits publishers with no items', async () => {
    LibraryService.getStudios.mockResolvedValue([{ Name: 'Netflix' }]);
    LibraryService.getLibraryByPublisher.mockResolvedValue({ items: [], totalRecordCount: 0 });

    const categories = await HomeCategoriesService.getHomeCategories('u1', 't1');

    expect(categories.publishers).toEqual([]);
  });
});
