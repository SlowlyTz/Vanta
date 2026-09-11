import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestsApi } from '../../../src/public/js/api/requests.api.js';
import RequestDetailPage from '../../../src/public/js/pages/request-detail.page.js';

vi.mock('../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: {
    getDetails: vi.fn(),
    crossCheck: vi.fn(),
    getMyRequests: vi.fn(),
    createRequest: vi.fn(),
    getSeason: vi.fn()
  }
}));

vi.mock('../../../src/public/js/store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

function makeDetails(overrides = {}) {
  return {
    id: 1,
    title: 'Test Movie',
    overview: 'A test movie.',
    release_date: '2020-01-01',
    ...overrides
  };
}

function makeTvDetails(overrides = {}) {
  return {
    id: 42,
    name: 'Test Show',
    overview: 'A test show.',
    first_air_date: '2019-01-01',
    seasons: [
      { season_number: 0, name: 'Specials', episode_count: 3 },
      { season_number: 1, name: 'Staffel 1', episode_count: 10 },
      { season_number: 2, name: 'Staffel 2', episode_count: 8 }
    ],
    ...overrides
  };
}

async function flush() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

const scopeSection = container => container.querySelector('.request-scope-section');
const seasonButton = (container, number) =>
  container.querySelector(`.request-scope-season[data-season-number="${number}"]`);
const modeButton = (container, scope) =>
  container.querySelector(`.request-scope-mode[data-scope="${scope}"]`);
const submitButton = container => container.querySelector('.request-scope-submit');
const actionLabels = container =>
  Array.from(container.querySelector('.detail-actions').children).map(btn => btn.textContent);

describe('RequestDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    RequestsApi.crossCheck.mockResolvedValue({ exists: false, seasons: [] });
    RequestsApi.getMyRequests.mockResolvedValue([]);
    RequestsApi.createRequest.mockResolvedValue({ id: 1 });
  });

  it('shows a local loader while fetching and removes it once rendered', async () => {
    let resolveDetails;
    RequestsApi.getDetails.mockReturnValue(new Promise(resolve => { resolveDetails = resolve; }));

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    expect(container.querySelector('.section-loader')).toBeTruthy();
    expect(container.getAttribute('aria-busy')).toBe('true');

    resolveDetails(makeDetails());
    await flush();

    expect(container.querySelector('.section-loader')).toBeNull();
    expect(container.hasAttribute('aria-busy')).toBe(false);
    expect(container.textContent).toContain('Test Movie');
  });

  it('replaces the loader with a retry action when loading fails', async () => {
    RequestsApi.getDetails.mockRejectedValue(new Error('boom'));

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    expect(container.querySelector('.section-loader')).toBeNull();
    const retryBtn = container.querySelector('button.btn-primary');
    expect(retryBtn.textContent).toBe('Erneut versuchen');

    RequestsApi.getDetails.mockResolvedValue(makeDetails());
    retryBtn.click();
    expect(container.querySelector('.section-loader')).toBeTruthy();

    await flush();
    expect(container.textContent).toContain('Test Movie');
  });

  it('renders on the shared detail hero layout', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails({ backdrop_path: '/backdrop.jpg' }));

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    expect(container.querySelector('.detail-page')).toBeTruthy();
    expect(container.querySelector('.detail-hero-backdrop')).toBeTruthy();
  });

  it('renders the Anfragen and Zurück buttons side by side in detail-actions', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails());

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    const actions = container.querySelector('.detail-actions');
    expect(actions).toBeTruthy();
    expect(actionLabels(container)).toContain('Anfragen');
    expect(actionLabels(container)).toContain('Zurück');
  });

  it('only renders a Trailer button when a TMDB trailer is present', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails({ trailer: { site: 'YouTube', key: 'abc', name: 'Trailer', type: 'Trailer' } }));

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    expect(actionLabels(container)).toContain('Trailer');
  });

  it('renders no Trailer button when no trailer is available', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails({ trailer: null }));

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    expect(actionLabels(container)).not.toContain('Trailer');
  });

  it('calls RequestsApi.createRequest with scope all when the Anfragen button is clicked', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails());

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    const requestBtn = Array.from(container.querySelector('.detail-actions').children)
      .find(btn => btn.textContent === 'Anfragen');
    requestBtn.click();
    await flush();

    expect(RequestsApi.createRequest).toHaveBeenCalledWith(1, 'movie', '', { scope: 'all' });
    expect(requestBtn.textContent).toBe('Angefragt');
  });

  it('omits the Anfragen button for a movie that already exists in the library', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails());
    RequestsApi.crossCheck.mockResolvedValue({ exists: true, seasons: [] });

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    expect(actionLabels(container)).not.toContain('Anfragen');
    expect(scopeSection(container)).toBeNull();
    expect(container.textContent).toContain('In Mediathek verfügbar');
  });

  it('omits the Anfragen button when the media was already requested', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails({ requested: true }));

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    expect(actionLabels(container)).not.toContain('Anfragen');
    expect(container.textContent).toContain('Bereits angefragt');
  });

  it('still offers the missing seasons of a series that already exists in the library', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeTvDetails());
    RequestsApi.crossCheck.mockResolvedValue({
      exists: true,
      seasons: [
        { season_number: 0, name: 'Specials', exists: false, jellyfin_season_id: null, episode_count: 3, requestable: false, reason: 'special' },
        { season_number: 1, name: 'Staffel 1', exists: true, jellyfin_season_id: 'jf-1', episode_count: 10, requestable: false },
        { season_number: 2, name: 'Staffel 2', exists: false, jellyfin_season_id: null, episode_count: 8, requestable: true }
      ]
    });

    const container = RequestDetailPage({ type: 'tv', id: '42' });
    await flush();

    expect(scopeSection(container)).toBeTruthy();
    // Whole series is off the table, so the selector opens on the season list.
    expect(modeButton(container, 'season').classList.contains('active')).toBe(true);
    expect(seasonButton(container, 0).disabled).toBe(true);
    expect(seasonButton(container, 1).disabled).toBe(true);
    expect(seasonButton(container, 1).textContent).toContain('In Bibliothek');
    expect(seasonButton(container, 2).disabled).toBe(false);

    seasonButton(container, 2).click();
    submitButton(container).click();
    await flush();

    expect(RequestsApi.createRequest).toHaveBeenCalledTimes(1);
    expect(RequestsApi.createRequest).toHaveBeenCalledWith(42, 'tv', '', { scope: 'season', seasonNumber: 2 });
  });

  it('requests a whole series with scope all', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeTvDetails());

    const container = RequestDetailPage({ type: 'tv', id: '42' });
    await flush();

    expect(modeButton(container, 'all').classList.contains('active')).toBe(true);
    submitButton(container).click();
    await flush();

    expect(RequestsApi.createRequest).toHaveBeenCalledWith(42, 'tv', '', { scope: 'all' });
  });

  it('fires one createRequest per selected season', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeTvDetails());

    const container = RequestDetailPage({ type: 'tv', id: '42' });
    await flush();

    modeButton(container, 'season').click();
    seasonButton(container, 1).click();
    seasonButton(container, 2).click();
    expect(submitButton(container).textContent).toBe('2 Staffeln anfragen');

    submitButton(container).click();
    await flush();

    expect(RequestsApi.createRequest).toHaveBeenCalledTimes(2);
    expect(RequestsApi.createRequest).toHaveBeenNthCalledWith(1, 42, 'tv', '', { scope: 'season', seasonNumber: 1 });
    expect(RequestsApi.createRequest).toHaveBeenNthCalledWith(2, 42, 'tv', '', { scope: 'season', seasonNumber: 2 });
  });

  it('reports which season failed when only part of a multi-season request goes through', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeTvDetails());
    RequestsApi.createRequest
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce(new Error('Diese Anfrage existiert bereits'));

    const container = RequestDetailPage({ type: 'tv', id: '42' });
    await flush();

    modeButton(container, 'season').click();
    seasonButton(container, 1).click();
    seasonButton(container, 2).click();
    submitButton(container).click();
    await flush();

    const hint = container.querySelector('.request-scope-hint');
    expect(hint.textContent).toContain('1 von 2');
    expect(hint.textContent).toContain('Staffel 2');
    expect(hint.textContent).toContain('Diese Anfrage existiert bereits');
    // The season that went through is now marked, the failed one stays selectable.
    expect(seasonButton(container, 1).disabled).toBe(true);
    expect(seasonButton(container, 2).disabled).toBe(false);
  });

  it('loads the episodes of a season lazily and requests a single episode', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeTvDetails());
    RequestsApi.getSeason.mockResolvedValue({
      season_number: 1,
      name: 'Staffel 1',
      episodes: [
        { episode_number: 1, name: 'Pilot', overview: '', still_path: null, air_date: '2019-01-01' },
        { episode_number: 3, name: 'Dritte Folge', overview: '', still_path: null, air_date: '2019-01-15' }
      ]
    });

    const container = RequestDetailPage({ type: 'tv', id: '42' });
    await flush();

    modeButton(container, 'episode').click();
    expect(RequestsApi.getSeason).not.toHaveBeenCalled();

    container.querySelector('.request-scope-season-toggle[data-season-number="1"]').click();
    await flush();

    expect(RequestsApi.getSeason).toHaveBeenCalledWith(42, 1);
    const episodes = container.querySelectorAll('.request-scope-episode');
    expect(episodes).toHaveLength(2);
    expect(episodes[1].textContent).toContain('S01E03');

    episodes[1].click();
    submitButton(container).click();
    await flush();

    expect(RequestsApi.createRequest).toHaveBeenCalledWith(42, 'tv', '', { scope: 'episode', seasonNumber: 1, episodeNumber: 3 });
  });

  it('skips the specials season in the episode picker', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeTvDetails());

    const container = RequestDetailPage({ type: 'tv', id: '42' });
    await flush();

    modeButton(container, 'episode').click();
    const toggles = container.querySelectorAll('.request-scope-season-toggle');
    expect(Array.from(toggles).map(t => t.dataset.seasonNumber)).toEqual(['1', '2']);
  });

  // Die Sperre gilt global: fragt ein anderer Nutzer eine Staffel an, darf sie
  // hier nicht erneut angeboten werden — der Server würde mit 409 antworten.
  it('blocks a scope that another user already requested', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeTvDetails());
    RequestsApi.getMyRequests.mockResolvedValue([]);
    RequestsApi.crossCheck.mockResolvedValue({
      exists: false,
      seasons: [],
      requestedScopes: [{ request_scope: 'season', season_number: 2, episode_number: null }]
    });

    const container = RequestDetailPage({ type: 'tv', id: '42' });
    await flush();

    modeButton(container, 'season').click();
    expect(seasonButton(container, 2).disabled).toBe(true);
    expect(seasonButton(container, 1).disabled).toBe(false);
    expect(RequestsApi.getMyRequests).not.toHaveBeenCalled();
  });

  it('blocks scopes that the user has already requested', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeTvDetails());
    RequestsApi.crossCheck.mockResolvedValue({
      exists: false,
      seasons: [],
      requestedScopes: [{ request_scope: 'season', season_number: 1, episode_number: null }]
    });

    const container = RequestDetailPage({ type: 'tv', id: '42' });
    await flush();

    modeButton(container, 'season').click();
    expect(seasonButton(container, 1).disabled).toBe(true);
    expect(seasonButton(container, 1).textContent).toContain('Angefragt');
    expect(seasonButton(container, 2).disabled).toBe(false);
  });

  it('disables the whole-series request once it is already requested', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeTvDetails());
    RequestsApi.crossCheck.mockResolvedValue({
      exists: false,
      seasons: [],
      requestedScopes: [{ request_scope: 'all', season_number: null, episode_number: null }]
    });

    const container = RequestDetailPage({ type: 'tv', id: '42' });
    await flush();

    expect(container.textContent).toContain('Bereits angefragt');
    expect(modeButton(container, 'season').classList.contains('active')).toBe(true);
    modeButton(container, 'all').click();
    expect(submitButton(container).disabled).toBe(true);
  });
});
