import { describe, it, expect, vi } from 'vitest';
import { createDuplicateFinder, describeFile } from '../../../src/server/services/duplicates.service.js';

const file = (id, filePath, extra = {}) => ({
  Id: id,
  DateCreated: '2025-01-01T00:00:00Z',
  MediaSources: [{
    Path: filePath,
    Container: 'mkv',
    Size: 4 * 1024 ** 3,
    MediaStreams: [
      { Type: 'Video', Width: 1920, Height: 1080, Codec: 'hevc' },
      { Type: 'Audio', Channels: 6, Language: 'ger', IsDefault: true },
      { Type: 'Subtitle', Language: 'eng' }
    ]
  }],
  ...extra
});

const GROUPS = [
  { key: 'Movie:tmdb:1', type: 'Movie', name: 'Mulan', year: 1998, copies: [{ id: 'm1', libraryName: 'Filme A' }, { id: 'm2', libraryName: 'Filme B' }] },
  { key: 'Series:tmdb:2', type: 'Series', name: 'Alice', year: 2020, copies: [{ id: 's1', libraryName: 'Serien A' }, { id: 's2', libraryName: 'Serien B' }] },
  { key: 'Series:tmdb:3', type: 'Series', name: 'Split', year: 2021, copies: [{ id: 'p1', libraryName: 'Serien A' }, { id: 'p2', libraryName: 'Serien B' }] }
];

const EPISODES = {
  // Alice: season 1 in both libraries.
  s1: [file('s1e1', '/a/Alice/S01/e1.mkv', { ParentIndexNumber: 1, IndexNumber: 1 }), file('s1e2', '/a/Alice/S01/e2.mkv', { ParentIndexNumber: 1, IndexNumber: 2 })],
  s2: [file('s2e1', '/b/Alice/S01/e1.mkv', { ParentIndexNumber: 1, IndexNumber: 1 }), file('s2e21', '/b/Alice/S02/e1.mkv', { ParentIndexNumber: 2, IndexNumber: 1 })],
  // Split: season 1 here, season 2 there, nothing twice.
  p1: [file('p1e1', '/a/Split/S01/e1.mkv', { ParentIndexNumber: 1, IndexNumber: 1 })],
  p2: [file('p2e1', '/b/Split/S02/e1.mkv', { ParentIndexNumber: 2, IndexNumber: 1 })]
};

const fetchJson = vi.fn(async (path, { query }) => {
  if (query.Ids) return { Items: query.Ids.split(',').map(id => file(id, `/${id}/Mulan (1998).mkv`)) };
  return { Items: EPISODES[query.ParentId] || [] };
});

describe('duplicate finder', () => {
  it('describes where a file lies and what it holds', () => {
    expect(describeFile(file('x', '/media/Filme/Mulan (1998)/Mulan.mkv'), { libraryName: 'Filme' })).toMatchObject({
      itemId: 'x',
      libraryName: 'Filme',
      fileName: 'Mulan.mkv',
      folder: '/media/Filme/Mulan (1998)',
      resolution: '1080p',
      audio: '5.1',
      container: 'mkv',
      audioLanguages: ['ger'],
      subtitleLanguages: ['eng']
    });
  });

  it('reports films held twice and episodes in two libraries, not split seasons', async () => {
    const finder = createDuplicateFinder({ reader: () => ({ titleGroups: () => GROUPS }), fetchJson, apiKey: 'key', log: { warn: () => {} } });
    const { items } = await finder.list();
    expect(items.map(entry => entry.name)).toEqual(['Mulan', 'Alice']);
    expect(items[0].files.map(entry => entry.libraryName)).toEqual(['Filme A', 'Filme B']);
    expect(items[1]).toMatchObject({ type: 'Series', seasons: [1] });
    expect(items[1].episodes).toHaveLength(1);
    expect(items[1].episodes[0].files.map(entry => entry.path)).toEqual(['/a/Alice/S01/e1.mkv', '/b/Alice/S01/e1.mkv']);
    expect(finder.count()).toBe(2);
  });

  it('counts nothing before the first check and without a catalogue', async () => {
    const finder = createDuplicateFinder({ reader: () => null, fetchJson, log: { warn: () => {} } });
    expect(finder.count()).toBeNull();
    expect(await finder.list()).toBeNull();
  });
});
