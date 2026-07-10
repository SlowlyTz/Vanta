import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestsApi } from '../api/requests.api.js';
import RequestDetailPage from './request-detail.page.js';

vi.mock('../api/requests.api.js', () => ({
  RequestsApi: {
    getDetails: vi.fn(),
    crossCheck: vi.fn(),
    getMyRequests: vi.fn()
  }
}));

function makeDetails(overrides = {}) {
  return {
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
});
