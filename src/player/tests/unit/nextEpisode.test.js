import { describe, it, expect } from 'vitest';
import { findNextEpisode } from '../../src/nextEpisode.js';

function makeContext(overrides = {}) {
  return {
    seriesId: 'series-1',
    seriesName: 'Test Series',
    currentEpisodeId: 'ep-1-1',
    seasons: [
      { Id: 'season-1', Name: 'Staffel 1', IndexNumber: 1 },
      { Id: 'season-2', Name: 'Staffel 2', IndexNumber: 2 }
    ],
    episodesBySeason: {
      'season-1': [
        { Id: 'ep-1-1', Name: 'Pilot', ParentIndexNumber: 1, IndexNumber: 1 },
        { Id: 'ep-1-2', Name: 'Folge 2', ParentIndexNumber: 1, IndexNumber: 2 }
      ],
      'season-2': [
        { Id: 'ep-2-1', Name: 'Staffel 2 Folge 1', ParentIndexNumber: 2, IndexNumber: 1 }
      ]
    },
    ...overrides
  };
}

describe('findNextEpisode', () => {
  it('findet die nächste Episode in derselben Staffel', () => {
    const result = findNextEpisode(makeContext(), 'ep-1-1');
    expect(result).toMatchObject({ kind: 'next-episode', episode: { Id: 'ep-1-2' } });
  });

  it('findet die erste Episode der nächsten Staffel, wenn die aktuelle die letzte der Staffel ist', () => {
    const result = findNextEpisode(makeContext(), 'ep-1-2');
    expect(result).toMatchObject({
      kind: 'next-season',
      episode: { Id: 'ep-2-1' },
      season: { Id: 'season-2' },
      fromSeason: { Id: 'season-1' }
    });
  });

  it('gibt null zurück, wenn keine weitere Episode existiert', () => {
    const result = findNextEpisode(makeContext(), 'ep-2-1');
    expect(result).toBeNull();
  });

  it('gibt null zurück, wenn die aktuelle Episode nicht gefunden wird', () => {
    const result = findNextEpisode(makeContext(), 'unknown');
    expect(result).toBeNull();
  });

  it('überspringt leere Zwischenstaffeln auf der Suche nach der nächsten Episode', () => {
    const context = makeContext({
      seasons: [
        { Id: 'season-1', Name: 'Staffel 1', IndexNumber: 1 },
        { Id: 'season-2', Name: 'Staffel 2 (leer)', IndexNumber: 2 },
        { Id: 'season-3', Name: 'Staffel 3', IndexNumber: 3 }
      ],
      episodesBySeason: {
        'season-1': [
          { Id: 'ep-1-1', Name: 'Pilot', ParentIndexNumber: 1, IndexNumber: 1 },
          { Id: 'ep-1-2', Name: 'Folge 2', ParentIndexNumber: 1, IndexNumber: 2 }
        ],
        'season-2': [],
        'season-3': [
          { Id: 'ep-3-1', Name: 'Staffel 3 Folge 1', ParentIndexNumber: 3, IndexNumber: 1 }
        ]
      }
    });

    const result = findNextEpisode(context, 'ep-1-2');
    expect(result).toMatchObject({ kind: 'next-season', episode: { Id: 'ep-3-1' }, season: { Id: 'season-3' } });
  });

  it('sortiert Staffeln und Episoden unabhängig von der Eingabereihenfolge', () => {
    const context = makeContext({
      seasons: [
        { Id: 'season-2', Name: 'Staffel 2', IndexNumber: 2 },
        { Id: 'season-1', Name: 'Staffel 1', IndexNumber: 1 }
      ],
      episodesBySeason: {
        'season-1': [
          { Id: 'ep-1-2', Name: 'Folge 2', ParentIndexNumber: 1, IndexNumber: 2 },
          { Id: 'ep-1-1', Name: 'Pilot', ParentIndexNumber: 1, IndexNumber: 1 }
        ],
        'season-2': [
          { Id: 'ep-2-1', Name: 'Staffel 2 Folge 1', ParentIndexNumber: 2, IndexNumber: 1 }
        ]
      }
    });

    const result = findNextEpisode(context, 'ep-1-1');
    expect(result).toMatchObject({ kind: 'next-episode', episode: { Id: 'ep-1-2' } });
  });

  it('nutzt currentEpisodeId aus dem Kontext als Standard', () => {
    const result = findNextEpisode(makeContext());
    expect(result).toMatchObject({ kind: 'next-episode', episode: { Id: 'ep-1-2' } });
  });

  it('gibt null zurück bei fehlendem Kontext', () => {
    expect(findNextEpisode(null, 'ep-1-1')).toBeNull();
    expect(findNextEpisode(undefined)).toBeNull();
  });
});
