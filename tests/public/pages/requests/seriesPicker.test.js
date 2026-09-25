import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestsApi } from '../../../../src/public/js/api/requests.api.js';
import { appStore } from '../../../../src/public/js/store/app.store.js';
import { createSeriesPicker, seasonState } from '../../../../src/public/js/pages/requests/seriesPicker.js';
import { buildRequestCoverage } from '../../../../src/public/js/pages/requests/helpers.js';

vi.mock('../../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: { createRequest: vi.fn(), getSeason: vi.fn() }
}));
vi.mock('../../../../src/public/js/store/app.store.js', () => ({ appStore: { showToast: vi.fn() } }));

async function flush() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

const season = (n, overrides = {}) => ({
  season_number: n, name: `Staffel ${n}`, episode_count: 10, poster_path: null,
  exists: false, complete: false, availableEpisodes: [], requestable: true, special: false, ...overrides
});

const segment = (picker, label) => [...picker.element.querySelectorAll('.ui-segment')].find(b => b.textContent === label);
const barButton = picker => picker.element.querySelector('.series-picker-bar button');
const barText = picker => picker.element.querySelector('.series-picker-bar .ui-action-bar-text').textContent;

describe('seasonState', () => {
  it('tells library, partial, requested, missing and specials apart', () => {
    const cover = buildRequestCoverage([{ request_scope: 'season', season_number: 3 }]);
    expect(seasonState(season(1, { complete: true }), cover).label).toBe('In Bibliothek');
    expect(seasonState(season(2, { exists: true, availableEpisodes: [1, 2, 3] }), cover).label).toBe('Teilweise · 3/10');
    expect(seasonState(season(3), cover).label).toBe('Angefragt');
    expect(seasonState(season(4), cover)).toMatchObject({ label: 'Fehlt', selectable: true });
    expect(seasonState(season(0, { special: true }), cover).selectable).toBe(false);
  });
});

describe('createSeriesPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    RequestsApi.createRequest.mockResolvedValue({});
  });

  it('requests the whole series when nothing of it exists yet', async () => {
    const picker = createSeriesPicker({ tmdbId: 42, seasons: [season(1), season(2)] });
    expect(segment(picker, 'Komplette Serie').classList.contains('is-active')).toBe(true);
    expect(barButton(picker).textContent).toBe('Serie anfragen');

    barButton(picker).click();
    await flush();

    expect(RequestsApi.createRequest).toHaveBeenCalledWith(42, 'tv', '', expect.objectContaining({ scope: 'all' }));
    expect(appStore.showToast).toHaveBeenCalledWith('Komplette Serie angefragt', 'success');
  });

  it('asks for missing seasons of a series already in the library, one request each', async () => {
    const picker = createSeriesPicker({
      tmdbId: 42,
      seriesExists: true,
      seasons: [season(1, { exists: true, complete: true, requestable: false }), season(2), season(3)]
    });

    expect(segment(picker, 'Komplette Serie').disabled).toBe(true);
    expect(segment(picker, 'Staffeln').classList.contains('is-active')).toBe(true);
    expect(barButton(picker).disabled).toBe(true);

    const rows = picker.element.querySelectorAll('.series-picker-season');
    expect(rows[0].disabled).toBe(true);
    rows[1].click();
    picker.element.querySelectorAll('.series-picker-season')[2].click();
    expect(barText(picker)).toBe('2 Staffeln: 2, 3');

    barButton(picker).click();
    await flush();

    expect(RequestsApi.createRequest.mock.calls.map(call => call[3].seasonNumber)).toEqual([2, 3]);
    expect(appStore.showToast).toHaveBeenCalledWith('2 Anfragen gestellt', 'success');
    expect([...picker.element.querySelectorAll('.series-picker-season .ui-chip')].map(chip => chip.textContent))
      .toEqual(['In Bibliothek', 'Angefragt', 'Angefragt']);
  });

  it('picks several episodes of a partly present season, skipping those in the library or requested', async () => {
    RequestsApi.getSeason.mockResolvedValue({
      episodes: [1, 2, 3, 4].map(n => ({ episode_number: n, name: `Folge ${n}`, air_date: '2024-01-01' }))
    });
    const picker = createSeriesPicker({
      tmdbId: 42,
      seriesExists: true,
      coverage: buildRequestCoverage([{ request_scope: 'episode', season_number: 2, episode_number: 3 }]),
      seasons: [season(2, { exists: true, availableEpisodes: [1] })]
    });

    segment(picker, 'Folgen').click();
    picker.element.querySelector('.series-picker-season').click();
    await flush();

    const episodes = [...picker.element.querySelectorAll('.series-picker-episode')];
    expect(episodes.map(row => row.disabled)).toEqual([true, false, true, false]);
    episodes[1].click();
    picker.element.querySelectorAll('.series-picker-episode')[3].click();
    expect(barText(picker)).toBe('2 Folgen ausgewählt');

    barButton(picker).click();
    await flush();
    expect(RequestsApi.createRequest.mock.calls.map(call => [call[3].seasonNumber, call[3].episodeNumber])).toEqual([[2, 2], [2, 4]]);
  });

  it('keeps what failed selected and says so', async () => {
    RequestsApi.createRequest.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('Diese Anfrage existiert bereits'));
    const picker = createSeriesPicker({ tmdbId: 42, seriesExists: true, seasons: [season(1), season(2)] });
    picker.element.querySelectorAll('.series-picker-season')[0].click();
    picker.element.querySelectorAll('.series-picker-season')[1].click();

    barButton(picker).click();
    await flush();

    expect(appStore.showToast).toHaveBeenCalledWith('1 angefragt, 1 fehlgeschlagen: Diese Anfrage existiert bereits', 'error');
    expect(barText(picker)).toBe('1 Staffel: 2');
  });

  it('blocks everything for a banned series', () => {
    const picker = createSeriesPicker({ tmdbId: 42, banned: true, seasons: [season(1)] });
    expect([...picker.element.querySelectorAll('.ui-segment')].every(button => button.disabled)).toBe(true);
    expect(barButton(picker).disabled).toBe(true);
    expect(barText(picker)).toContain('abgelehnt');
  });
});
