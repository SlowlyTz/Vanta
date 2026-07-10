import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client.js', () => ({
  jellyfinJson: vi.fn()
}));

import { jellyfinJson } from './client.js';
import { LibraryService } from './library.service.js';

function studio(name) {
  return { Name: name };
}

function item(id, name = `Item ${id}`) {
  return { Id: id, Name: name, SortName: name };
}

describe('LibraryService.getPublisherStudioNames', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws a 400 error for an unknown publisher id', async () => {
    await expect(
      LibraryService.getPublisherStudioNames('u1', 't1', 'not-a-publisher')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('resolves all matching Jellyfin studio names for a known publisher', async () => {
    jellyfinJson.mockResolvedValue({
      Items: [studio('Warner Bros. Pictures'), studio('Warner Bros. Animation'), studio('Some Indie Studio')]
    });

    const names = await LibraryService.getPublisherStudioNames('u1', 't1', 'warner-bros');

    expect(names).toEqual(['Warner Bros. Pictures', 'Warner Bros. Animation']);
  });
});

describe('LibraryService.getLibraryByPublisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty result when no studio names match the publisher', async () => {
    jellyfinJson.mockResolvedValue({ Items: [] });

    const result = await LibraryService.getLibraryByPublisher('u1', 't1', 'Movie', 'warner-bros');

    expect(result).toEqual({ items: [], totalRecordCount: 0 });
  });

  it('queries every matching studio variant and dedupes items by Id', async () => {
    jellyfinJson.mockImplementation((path, options) => {
      if (path === '/Studios') {
        return Promise.resolve({ Items: [studio('Warner Bros. Pictures'), studio('Warner Bros. Animation')] });
      }
      const studioName = options.query.Studios;
      if (studioName === 'Warner Bros. Pictures') {
        return Promise.resolve({ Items: [item('1', 'Batman'), item('2', 'Dune')], TotalRecordCount: 2 });
      }
      if (studioName === 'Warner Bros. Animation') {
        return Promise.resolve({ Items: [item('2', 'Dune'), item('3', 'Titans')], TotalRecordCount: 2 });
      }
      return Promise.resolve({ Items: [], TotalRecordCount: 0 });
    });

    const result = await LibraryService.getLibraryByPublisher('u1', 't1', 'Movie', 'warner-bros');

    expect(result.totalRecordCount).toBe(3);
    expect(result.items.map(i => i.Id).sort()).toEqual(['1', '2', '3']);
  });

  it('combines results across multiple item types', async () => {
    jellyfinJson.mockImplementation((path, options) => {
      if (path === '/Studios') {
        return Promise.resolve({ Items: [studio('Netflix')] });
      }
      const type = options.query.IncludeItemTypes;
      if (type === 'Movie') {
        return Promise.resolve({ Items: [item('1', 'Movie A')], TotalRecordCount: 1 });
      }
      if (type === 'Series') {
        return Promise.resolve({ Items: [item('2', 'Series A')], TotalRecordCount: 1 });
      }
      return Promise.resolve({ Items: [], TotalRecordCount: 0 });
    });

    const result = await LibraryService.getLibraryByPublisher('u1', 't1', 'Movie,Series', 'netflix');

    expect(result.totalRecordCount).toBe(2);
    expect(result.items.map(i => i.Id).sort()).toEqual(['1', '2']);
  });

  it('paginates the deduplicated result after merging', async () => {
    jellyfinJson.mockImplementation((path, options) => {
      if (path === '/Studios') {
        return Promise.resolve({ Items: [studio('Netflix')] });
      }
      const items = [item('1', 'A'), item('2', 'B'), item('3', 'C')];
      return Promise.resolve({ Items: items, TotalRecordCount: items.length });
    });

    const result = await LibraryService.getLibraryByPublisher('u1', 't1', 'Movie', 'netflix', null, 2, 2);

    expect(result.totalRecordCount).toBe(3);
    expect(result.items.map(i => i.Id)).toEqual(['3']);
  });

  it('sorts merged items by SortName || Name', async () => {
    jellyfinJson.mockImplementation((path, options) => {
      if (path === '/Studios') {
        return Promise.resolve({ Items: [studio('Netflix')] });
      }
      return Promise.resolve({
        Items: [item('1', 'Zebra'), item('2', 'Alpha')],
        TotalRecordCount: 2
      });
    });

    const result = await LibraryService.getLibraryByPublisher('u1', 't1', 'Movie', 'netflix');

    expect(result.items.map(i => i.Name)).toEqual(['Alpha', 'Zebra']);
  });
});

describe('LibraryService.getLibrary (exact studio filter unchanged)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the exact studio name through to the Jellyfin query', async () => {
    jellyfinJson.mockResolvedValue({ Items: [item('1')], TotalRecordCount: 1 });

    await LibraryService.getLibrary('u1', 't1', 'Movie', null, 'Warner Bros. Pictures', 1, 50);

    expect(jellyfinJson).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ query: expect.objectContaining({ Studios: 'Warner Bros. Pictures' }) })
    );
  });
});
