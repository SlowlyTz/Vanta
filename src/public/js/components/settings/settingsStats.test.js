import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSettingsOverview } from '../navbar/settingsOverview.js';
import { createSettingsStatsLoader } from './settingsStats.js';

vi.mock('../../api/media.api.js', () => ({
  MediaApi: { getLibrary: vi.fn() }
}));

describe('createSettingsStatsLoader', () => {
  let MediaApi;

  beforeEach(async () => {
    ({ MediaApi } = await import('../../api/media.api.js'));
    MediaApi.getLibrary.mockReset();
  });

  it('shows a loading placeholder, then formatted totals per media type', async () => {
    MediaApi.getLibrary.mockImplementation((type) => {
      const totals = { Movie: 1234, Series: 56, Episode: 789 };
      return Promise.resolve({ totalItems: totals[type] });
    });

    const overview = createSettingsOverview();
    const { load } = createSettingsStatsLoader(overview);

    const pending = load();
    expect(overview.movies.textContent).toBe('...');

    await pending;

    expect(overview.movies.textContent).toBe('1.234');
    expect(overview.series.textContent).toBe('56');
    expect(overview.episodes.textContent).toBe('789');
  });

  it('does not reload once a successful load has completed', async () => {
    MediaApi.getLibrary.mockResolvedValue({ totalItems: 1 });
    const overview = createSettingsOverview();
    const { load } = createSettingsStatsLoader(overview);

    await load();
    await load();

    expect(MediaApi.getLibrary).toHaveBeenCalledTimes(3);
  });

  it('falls back to a dash when every request fails', async () => {
    MediaApi.getLibrary.mockRejectedValue(new Error('network down'));
    const overview = createSettingsOverview();
    const { load } = createSettingsStatsLoader(overview);

    await load();

    expect(overview.movies.textContent).toBe('-');
    expect(overview.series.textContent).toBe('-');
    expect(overview.episodes.textContent).toBe('-');
  });

  it('allows retrying after a failed load', async () => {
    MediaApi.getLibrary.mockRejectedValue(new Error('network down'));
    const overview = createSettingsOverview();
    const { load } = createSettingsStatsLoader(overview);

    await load();
    expect(overview.movies.textContent).toBe('-');

    MediaApi.getLibrary.mockResolvedValue({ totalItems: 10 });
    await load();

    expect(overview.movies.textContent).toBe('10');
  });
});
