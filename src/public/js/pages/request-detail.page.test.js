import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestsApi } from '../api/requests.api.js';
import RequestDetailPage from './request-detail.page.js';

vi.mock('../api/requests.api.js', () => ({
  RequestsApi: {
    getDetails: vi.fn(),
    crossCheck: vi.fn(),
    getMyRequests: vi.fn(),
    createRequest: vi.fn()
  }
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

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('RequestDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    RequestsApi.crossCheck.mockResolvedValue({ exists: false, seasons: [] });
    RequestsApi.getMyRequests.mockResolvedValue([]);
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
    const labels = Array.from(actions.children).map(btn => btn.textContent);
    expect(labels).toContain('Anfragen');
    expect(labels).toContain('Zurück');
  });

  it('only renders a Trailer button when a TMDB trailer is present', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails({ trailer: { site: 'YouTube', key: 'abc', name: 'Trailer', type: 'Trailer' } }));

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    const labels = Array.from(container.querySelector('.detail-actions').children).map(btn => btn.textContent);
    expect(labels).toContain('Trailer');
  });

  it('renders no Trailer button when no trailer is available', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails({ trailer: null }));

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    const labels = Array.from(container.querySelector('.detail-actions').children).map(btn => btn.textContent);
    expect(labels).not.toContain('Trailer');
  });

  it('calls RequestsApi.createRequest when the Anfragen button is clicked', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails());
    RequestsApi.createRequest.mockResolvedValue({ id: 1 });

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    const requestBtn = Array.from(container.querySelector('.detail-actions').children)
      .find(btn => btn.textContent === 'Anfragen');
    requestBtn.click();
    await flush();

    expect(RequestsApi.createRequest).toHaveBeenCalledWith(1, 'movie', '');
    expect(requestBtn.textContent).toBe('Angefragt');
  });

  it('omits the Anfragen button when the media already exists in the library', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails());
    RequestsApi.crossCheck.mockResolvedValue({ exists: true, seasons: [] });

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    const labels = Array.from(container.querySelector('.detail-actions').children).map(btn => btn.textContent);
    expect(labels).not.toContain('Anfragen');
    expect(container.textContent).toContain('In Mediathek verfügbar');
  });

  it('omits the Anfragen button when the media was already requested', async () => {
    RequestsApi.getDetails.mockResolvedValue(makeDetails({ requested: true }));

    const container = RequestDetailPage({ type: 'movie', id: '1' });
    await flush();

    const labels = Array.from(container.querySelector('.detail-actions').children).map(btn => btn.textContent);
    expect(labels).not.toContain('Anfragen');
    expect(container.textContent).toContain('Bereits angefragt');
  });
});
