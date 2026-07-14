import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/server/services/jellyfin/client.js', () => ({
  jellyfinJson: vi.fn()
}));

import { jellyfinJson } from '../../../../src/server/services/jellyfin/client.js';
import { LibraryService } from '../../../../src/server/services/jellyfin/library.service.js';

function studio(name) {
  return { Name: name };
}

function item(id, name = `Item ${id}`) {
  return { Id: id, Name: name, SortName: name };
}

function episode(id, { seasonId = 's1', season = 1, index = 1, seriesId = 'series-1', userData = {}, runtimeTicks = 10_000_000_000 } = {}) {
  return {
    Id: id,
    Type: 'Episode',
    Name: `Episode ${id}`,
    SeriesId: seriesId,
    ParentIndexNumber: season,
    IndexNumber: index,
    RunTimeTicks: runtimeTicks,
    UserData: userData
  };
}

function movie(id, userData = {}) {
  return { Id: id, Type: 'Movie', Name: `Movie ${id}`, UserData: userData };
}

describe('LibraryService.getResumeItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockUpstream({ resumable, seasons = [], episodesBySeason = {} }) {
    jellyfinJson.mockImplementation((path, options) => {
      if (path.endsWith('/Items') && options.query.Filters === 'IsResumable') {
        return Promise.resolve({ Items: resumable });
      }
      if (path.includes('/Seasons')) {
        return Promise.resolve({ Items: seasons });
      }
      if (path.includes('/Episodes')) {
        const seasonId = options.query.seasonId;
        return Promise.resolve({ Items: episodesBySeason[seasonId] || [] });
      }
      return Promise.resolve({ Items: [] });
    });
  }

  it('lässt Filme unverändert', async () => {
    mockUpstream({ resumable: [movie('m1', { PlayedPercentage: 40 })] });

    const items = await LibraryService.getResumeItems('u1', 't1');

    expect(items).toEqual([movie('m1', { PlayedPercentage: 40 })]);
  });

  it('lässt Episoden unter 90% Fortschritt unverändert', async () => {
    mockUpstream({ resumable: [episode('e1', { userData: { PlayedPercentage: 50 } })] });

    const items = await LibraryService.getResumeItems('u1', 't1');

    expect(items).toHaveLength(1);
    expect(items[0].Id).toBe('e1');
  });

  it('mappt eine fast fertige Episode auf die nächste Folge derselben Staffel', async () => {
    mockUpstream({
      resumable: [episode('e1', { userData: { PlayedPercentage: 95 } })],
      seasons: [{ Id: 's1', IndexNumber: 1 }],
      episodesBySeason: {
        s1: [
          { Id: 'e1', ParentIndexNumber: 1, IndexNumber: 1 },
          { Id: 'e2', ParentIndexNumber: 1, IndexNumber: 2 }
        ]
      }
    });

    const items = await LibraryService.getResumeItems('u1', 't1');

    expect(items).toHaveLength(1);
    expect(items[0].Id).toBe('e2');
  });

  it('mappt die letzte Folge einer Staffel auf die erste Folge der nächsten Staffel', async () => {
    mockUpstream({
      resumable: [episode('e2', { userData: { PlayedPercentage: 95 } })],
      seasons: [{ Id: 's1', IndexNumber: 1 }, { Id: 's2', IndexNumber: 2 }],
      episodesBySeason: {
        s1: [
          { Id: 'e1', ParentIndexNumber: 1, IndexNumber: 1 },
          { Id: 'e2', ParentIndexNumber: 1, IndexNumber: 2 }
        ],
        s2: [
          { Id: 'e3', ParentIndexNumber: 2, IndexNumber: 1 }
        ]
      }
    });

    const items = await LibraryService.getResumeItems('u1', 't1');

    expect(items).toHaveLength(1);
    expect(items[0].Id).toBe('e3');
  });

  it('entfernt die letzte Folge der gesamten Serie aus Continue Watching', async () => {
    mockUpstream({
      resumable: [episode('e2', { userData: { PlayedPercentage: 95 } })],
      seasons: [{ Id: 's1', IndexNumber: 1 }],
      episodesBySeason: {
        s1: [
          { Id: 'e1', ParentIndexNumber: 1, IndexNumber: 1 },
          { Id: 'e2', ParentIndexNumber: 1, IndexNumber: 2 }
        ]
      }
    });

    const items = await LibraryService.getResumeItems('u1', 't1');

    expect(items).toEqual([]);
  });

  it('nutzt PlaybackPositionTicks/RunTimeTicks als Fallback ohne PlayedPercentage', async () => {
    mockUpstream({
      resumable: [episode('e1', {
        userData: { PlaybackPositionTicks: 9_500_000_000 },
        runtimeTicks: 10_000_000_000
      })],
      seasons: [{ Id: 's1', IndexNumber: 1 }],
      episodesBySeason: {
        s1: [
          { Id: 'e1', ParentIndexNumber: 1, IndexNumber: 1 },
          { Id: 'e2', ParentIndexNumber: 1, IndexNumber: 2 }
        ]
      }
    });

    const items = await LibraryService.getResumeItems('u1', 't1');

    expect(items).toHaveLength(1);
    expect(items[0].Id).toBe('e2');
  });

  it('dedupliziert, wenn die nächste Episode bereits separat in Continue Watching enthalten ist', async () => {
    mockUpstream({
      resumable: [
        episode('e1', { userData: { PlayedPercentage: 95 } }),
        episode('e2', { userData: { PlayedPercentage: 10 } })
      ],
      seasons: [{ Id: 's1', IndexNumber: 1 }],
      episodesBySeason: {
        s1: [
          { Id: 'e1', ParentIndexNumber: 1, IndexNumber: 1 },
          { Id: 'e2', ParentIndexNumber: 1, IndexNumber: 2 }
        ]
      }
    });

    const items = await LibraryService.getResumeItems('u1', 't1');

    expect(items.map(item => item.Id)).toEqual(['e2']);
  });
});

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
