import { describe, it, expect } from 'vitest';
import { formatEpisodeCode, findEpisode, findSeasonIdOfEpisode } from '../../../src/player/src/episodes.js';

function makeContext(overrides = {}) {
  return {
    seriesId: 'series-1',
    seriesName: 'Test Series',
    currentEpisodeId: 'ep-1',
    seasons: [{ Id: 'season-1', Name: 'Staffel 1', IndexNumber: 1 }],
    episodesBySeason: {
      'season-1': [
        { Id: 'ep-1', Name: 'Pilot', ParentIndexNumber: 1, IndexNumber: 1 },
        { Id: 'ep-2', Name: 'Folge 2', ParentIndexNumber: 1, IndexNumber: 2 }
      ]
    },
    ...overrides
  };
}

describe('formatEpisodeCode', () => {
  it('formatiert Staffel und Episode zweistellig', () => {
    expect(formatEpisodeCode({ ParentIndexNumber: 1, IndexNumber: 2 })).toBe('S01E02');
    expect(formatEpisodeCode({ ParentIndexNumber: 12, IndexNumber: 34 })).toBe('S12E34');
  });
});

describe('findEpisode', () => {
  it('findet eine Episode über alle Staffeln hinweg', () => {
    const context = makeContext();
    expect(findEpisode(context, 'ep-2')?.Name).toBe('Folge 2');
    expect(findEpisode(context, 'unknown')).toBeNull();
  });
});

describe('findSeasonIdOfEpisode', () => {
  it('findet die Staffel der laufenden Folge und fällt sonst auf die erste zurück', () => {
    const context = makeContext({
      seasons: [{ Id: 'season-1' }, { Id: 'season-2' }],
      episodesBySeason: { 'season-1': [{ Id: 'ep-1' }], 'season-2': [{ Id: 'ep-9' }] }
    });
    expect(findSeasonIdOfEpisode(context, 'ep-9')).toBe('season-2');
    expect(findSeasonIdOfEpisode(context, 'unknown')).toBe('season-1');
    expect(findSeasonIdOfEpisode(null, 'ep-1')).toBeNull();
  });
});
