import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../../../../src/public/js/api/media.api.js';
import { buildSeasonsSection } from '../../../../src/public/js/pages/detail/seasonsSection.js';

vi.mock('../../../../src/public/js/api/media.api.js', () => ({
  MediaApi: { getEpisodes: vi.fn() }
}));

function makeEpisode(id) {
  return { Id: id, Type: 'Episode', Name: `Episode ${id}`, IndexNumber: 1, ParentIndexNumber: 1 };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('buildSeasonsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('shows a compact loader in the episode grid only, then replaces it with episode cards', async () => {
    let resolveEpisodes;
    MediaApi.getEpisodes.mockReturnValue(new Promise(resolve => { resolveEpisodes = resolve; }));

    const item = { Id: 'series-1', Type: 'Series' };
    const seasons = [{ Id: 'season-1', Name: 'Staffel 1', IndexNumber: 1 }];

    const section = buildSeasonsSection(item, seasons);
    await vi.advanceTimersByTimeAsync(50);

    const grid = section.querySelector('.episodes-grid');
    expect(grid.querySelector('.section-loader.section-loader-compact')).toBeTruthy();
    expect(grid.getAttribute('aria-busy')).toBe('true');
    expect(section.querySelector('.seasons-tabs')).toBeTruthy();

    vi.useRealTimers();
    resolveEpisodes([makeEpisode('e1')]);
    await flush();

    expect(grid.querySelector('.section-loader')).toBeNull();
    expect(grid.hasAttribute('aria-busy')).toBe(false);
    expect(grid.querySelectorAll('.media-card')).toHaveLength(1);
  });
});
