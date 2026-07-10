import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestsApi } from '../api/requests.api.js';
import RequestsPage from './requests.page.js';

vi.mock('../api/requests.api.js', () => ({
  RequestsApi: {
    search: vi.fn(),
    getMyRequests: vi.fn()
  }
}));

function makeResult(id) {
  return { id, media_type: 'movie', title: `Movie ${id}` };
}

function makeMyRequest(id) {
  return { id, tmdb_id: id, tmdb_type: 'movie', title: `Movie ${id}`, status: 'pending' };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('RequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows a local compact loader in the new-request search area without blocking the search input', async () => {
    let resolveSearch;
    RequestsApi.search.mockReturnValue(new Promise(resolve => { resolveSearch = resolve; }));

    const container = RequestsPage({ view: 'new' });
    const input = container.querySelector('.requests-new-view .search-input-field');

    vi.useFakeTimers();
    input.value = 'matrix';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(450);
    vi.useRealTimers();

    const loading = container.querySelector('.requests-search-loading');
    expect(loading.classList.contains('hidden')).toBe(false);
    expect(loading.querySelector('.section-loader')).toBeTruthy();
    expect(input.disabled).toBe(false);

    resolveSearch([makeResult(1)]);
    await flush();

    expect(loading.classList.contains('hidden')).toBe(true);
    expect(container.querySelectorAll('.request-card')).toHaveLength(1);
  });

  it('shows a local loader in the my-requests list area while fetching, then renders results', async () => {
    let resolveMine;
    RequestsApi.getMyRequests.mockReturnValue(new Promise(resolve => { resolveMine = resolve; }));

    const container = RequestsPage({ view: 'list' });
    const list = container.querySelector('.my-requests-grid');
    expect(list.querySelector('.section-loader')).toBeTruthy();
    expect(list.getAttribute('aria-busy')).toBe('true');

    resolveMine([makeMyRequest(1)]);
    await flush();

    expect(list.querySelector('.section-loader')).toBeNull();
    expect(list.hasAttribute('aria-busy')).toBe(false);
    expect(list.querySelectorAll('.my-request-card')).toHaveLength(1);
  });
});
