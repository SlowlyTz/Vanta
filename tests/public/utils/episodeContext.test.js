import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/public/js/api/media.api.js', () => ({
  MediaApi: {
    getSeasons: vi.fn(async () => [{ Id: 's1' }, { Id: 's2' }]),
    getEpisodes: vi.fn(async (seriesId, seasonId) => [{ Id: `${seasonId}-e1` }])
  }
}));

const { MediaApi } = await import('../../../src/public/js/api/media.api.js');
const { loadEpisodeContext } = await import('../../../src/public/js/utils/episodeContext.js');

describe('loadEpisodeContext', () => {
  it('loads every season at once and passes the signal on', async () => {
    const signal = new AbortController().signal;
    const context = await loadEpisodeContext({ Type: 'Episode', Id: 'e', SeriesId: 'x', SeriesName: 'X' }, { signal });

    expect(context.episodesBySeason).toEqual({ s1: [{ Id: 's1-e1' }], s2: [{ Id: 's2-e1' }] });
    expect(MediaApi.getEpisodes).toHaveBeenCalledWith('x', 's2', { signal });
  });

  it('answers null for anything but an episode', async () => {
    expect(await loadEpisodeContext({ Type: 'Movie', Id: 'm' })).toBeNull();
  });
});
