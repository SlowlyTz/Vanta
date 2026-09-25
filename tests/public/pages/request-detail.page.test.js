import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestsApi } from '../../../src/public/js/api/requests.api.js';
import { appStore } from '../../../src/public/js/store/app.store.js';
import RequestDetailPage from '../../../src/public/js/pages/request-detail.page.js';

vi.mock('../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: { getDetails: vi.fn(), crossCheck: vi.fn(), createRequest: vi.fn(), getSeason: vi.fn() }
}));
vi.mock('../../../src/public/js/store/app.store.js', () => ({ appStore: { showToast: vi.fn() } }));

async function flush() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

const movie = (overrides = {}) => ({ id: 1, title: 'Test Movie', overview: 'A test movie.', release_date: '2020-01-01', ...overrides });
const show = () => ({
  id: 42, name: 'Test Show', first_air_date: '2019-01-01',
  seasons: [
    { season_number: 0, name: 'Specials', episode_count: 3 },
    { season_number: 1, name: 'Staffel 1', episode_count: 10 },
    { season_number: 2, name: 'Staffel 2', episode_count: 8 }
  ]
});

describe('RequestDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    RequestsApi.crossCheck.mockResolvedValue({ exists: false, seasons: [], requestedScopes: [] });
    RequestsApi.createRequest.mockResolvedValue({});
  });

  it('shows a loader, then the hero with title and meta', async () => {
    RequestsApi.getDetails.mockResolvedValue(movie());
    const container = RequestDetailPage({ type: 'movie', id: '1' });
    expect(container.querySelector('.section-loader')).toBeTruthy();
    await flush();

    expect(container.querySelector('.section-loader')).toBeNull();
    expect(container.querySelector('.request-hero-title').textContent).toBe('Test Movie');
    expect(container.querySelector('.request-hero-meta').textContent).toBe('Film · 2020');
  });

  it('requests a movie as a whole and confirms it', async () => {
    RequestsApi.getDetails.mockResolvedValue(movie());
    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    const button = container.querySelector('.request-movie-bar button');
    expect(button.textContent).toBe('Film anfragen');
    button.click();
    await flush();

    expect(RequestsApi.createRequest).toHaveBeenCalledWith(1, 'movie', '', { scope: 'all' });
    expect(button.textContent).toBe('Angefragt');
    expect(button.disabled).toBe(true);
    expect(appStore.showToast).toHaveBeenCalledWith('Film angefragt', 'success');
  });

  it('offers "Ansehen" for a movie that is in the library, instead of a request', async () => {
    RequestsApi.getDetails.mockResolvedValue(movie());
    RequestsApi.crossCheck.mockResolvedValue({ exists: true, jellyfinItemId: 'jf-9', seasons: [], requestedScopes: [] });
    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    const button = container.querySelector('.request-movie-bar button');
    expect(button.textContent).toBe('Ansehen');
    expect(container.querySelector('.request-hero-chips').textContent).toContain('In Bibliothek');
    button.click();
    expect(window.location.hash).toBe('#/item/jf-9');
  });

  it('blocks a banned or already requested movie', async () => {
    RequestsApi.getDetails.mockResolvedValue(movie({ banned: true }));
    let container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();
    expect(container.querySelector('.request-movie-bar button').disabled).toBe(true);
    expect(container.querySelector('.request-hero-chips').textContent).toContain('Abgelehnt');

    RequestsApi.getDetails.mockResolvedValue(movie({ requested: true }));
    container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();
    expect(container.querySelector('.request-movie-bar button').textContent).toBe('Angefragt');
  });

  it('shows the series picker, and for a series partly in the library starts on the seasons', async () => {
    RequestsApi.getDetails.mockResolvedValue(show());
    RequestsApi.crossCheck.mockResolvedValue({
      exists: true,
      seasons: [
        { season_number: 1, exists: true, complete: true, available_episodes: [], requestable: false },
        { season_number: 2, exists: true, complete: false, available_episodes: [1, 2], requestable: true }
      ],
      requestedScopes: []
    });
    const container = RequestDetailPage({ type: 'tv', id: '42' });
    await flush();

    expect(container.querySelector('.request-hero-chips').textContent).toContain('Teilweise in Bibliothek');
    const active = container.querySelector('.series-picker .ui-segment.is-active');
    expect(active.textContent).toBe('Staffeln');
    const rows = [...container.querySelectorAll('.series-picker-season')];
    expect(rows.map(row => row.querySelector('.ui-chip').textContent)).toEqual(['In Bibliothek', 'Teilweise · 2/8']);
    expect(rows[0].disabled).toBe(true);
    expect(rows[1].disabled).toBe(false);
  });

  it('offers a retry when loading fails', async () => {
    RequestsApi.getDetails.mockRejectedValueOnce(new Error('offline'));
    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    expect(container.querySelector('.ui-empty').textContent).toContain('offline');
    RequestsApi.getDetails.mockResolvedValue(movie());
    container.querySelector('.ui-empty button').click();
    await flush();
    expect(container.querySelector('.request-hero-title')).toBeTruthy();
  });
});
