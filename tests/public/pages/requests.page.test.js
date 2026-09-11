import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestsApi } from '../../../src/public/js/api/requests.api.js';
import RequestsPage from '../../../src/public/js/pages/requests.page.js';

vi.mock('../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: {
    search: vi.fn(),
    getMyRequests: vi.fn()
  }
}));

function makeResult(id) {
  return { id, media_type: 'movie', title: `Movie ${id}` };
}

function makeMyRequest(id, overrides = {}) {
  return { id, tmdb_id: id, tmdb_type: 'movie', title: `Movie ${id}`, status: 'pending', ...overrides };
}

function seedSearchState(results, query = 'matrix') {
  sessionStorage.setItem('vanta.requests.searchState', JSON.stringify({ query, results }));
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
    window.location.hash = '#/requests';
  });

  it('defaults to the Neue Anfrage tab and view when no view param is given', () => {
    RequestsApi.search.mockResolvedValue([]);

    const container = RequestsPage({});
    const tabs = container.querySelectorAll('.requests-tab');

    expect(tabs[0].textContent).toBe('Neue Anfrage');
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].classList.contains('active')).toBe(false);
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    expect(container.querySelector('.requests-new-view').classList.contains('hidden')).toBe(false);
    expect(container.querySelector('.requests-list-view').classList.contains('hidden')).toBe(true);
  });

  it('markiert das Suchfeld der neuen Anfrage für den Autofokus des Routers', () => {
    const container = RequestsPage({ view: 'new' });
    const input = container.querySelector('.requests-new-view .search-input-field');

    expect(input.hasAttribute('data-autofocus')).toBe(true);
  });

  it('activates the Meine Anfragen tab and loads requests when view is list', async () => {
    RequestsApi.getMyRequests.mockResolvedValue([]);

    const container = RequestsPage({ view: 'list' });
    const tabs = container.querySelectorAll('.requests-tab');

    expect(tabs[1].textContent).toBe('Meine Anfragen');
    expect(tabs[1].classList.contains('active')).toBe(true);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('.requests-list-view').classList.contains('hidden')).toBe(false);
    expect(container.querySelector('.requests-new-view').classList.contains('hidden')).toBe(true);
    expect(RequestsApi.getMyRequests).toHaveBeenCalled();

    await flush();
  });

  it('navigates via the hash when a tab is clicked', () => {
    RequestsApi.getMyRequests.mockResolvedValue([]);

    const container = RequestsPage({});
    const tabs = container.querySelectorAll('.requests-tab');

    tabs[1].click();
    expect(window.location.hash).toBe('#/requests/mine');
  });

  it('shows a compact empty state for Meine Anfragen when there are no requests', async () => {
    RequestsApi.getMyRequests.mockResolvedValue([]);

    const container = RequestsPage({ view: 'list' });
    await flush();

    const status = container.querySelector('.requests-list-view .search-empty-state');
    expect(status.classList.contains('hidden')).toBe(false);
    expect(status.textContent).toContain('Keine Anfragen');
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

  describe('search result cards', () => {
    it('navigates to the library detail view when an available hit is clicked', () => {
      seedSearchState([{ id: 5, media_type: 'movie', title: 'Movie 5', exists: true, jellyfinItemId: 'jf-5' }]);

      const container = RequestsPage({ view: 'new' });
      const card = container.querySelector('.request-card');

      expect(card.classList.contains('request-card-disabled')).toBe(false);
      expect(card.textContent).toContain('In Bibliothek');

      card.click();
      expect(window.location.hash).toBe('#/item/jf-5');
    });

    it('falls back to the request detail route when an available hit carries no Jellyfin id', () => {
      seedSearchState([{ id: 5, media_type: 'tv', name: 'Show 5', exists: true }]);

      const container = RequestsPage({ view: 'new' });
      container.querySelector('.request-card').click();

      expect(window.location.hash).toBe('#/request-detail/tv/5');
    });

    it('keeps banned and already requested hits inert', () => {
      seedSearchState([
        { id: 6, media_type: 'movie', title: 'Movie 6', banned: true },
        { id: 7, media_type: 'movie', title: 'Movie 7', requested: true }
      ]);

      const container = RequestsPage({ view: 'new' });
      const cards = container.querySelectorAll('.request-card');

      cards.forEach(card => {
        expect(card.classList.contains('request-card-disabled')).toBe(true);
        expect(card.getAttribute('aria-disabled')).toBe('true');
        card.click();
      });

      expect(window.location.hash).toBe('#/requests');
    });

    it('opens an available hit from the keyboard', () => {
      seedSearchState([{ id: 8, media_type: 'movie', title: 'Movie 8', exists: true, jellyfinItemId: 'jf-8' }]);

      const container = RequestsPage({ view: 'new' });
      const card = container.querySelector('.request-card');

      expect(card.getAttribute('role')).toBe('button');
      expect(card.getAttribute('tabindex')).toBe('0');
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(window.location.hash).toBe('#/item/jf-8');
    });

    it('routes a hit that is neither available nor blocked to the request detail view', () => {
      seedSearchState([{ id: 9, media_type: 'movie', title: 'Movie 9' }]);

      const container = RequestsPage({ view: 'new' });
      container.querySelector('.request-card').click();

      expect(window.location.hash).toBe('#/request-detail/movie/9');
    });
  });

  it('labels the scope of every own request', async () => {
    RequestsApi.getMyRequests.mockResolvedValue([
      makeMyRequest(1, { tmdb_type: 'tv', media_type: 'tv', request_scope: 'all' }),
      makeMyRequest(2, { tmdb_type: 'tv', media_type: 'tv', request_scope: 'season', season_number: 2 }),
      makeMyRequest(3, { tmdb_type: 'tv', media_type: 'tv', request_scope: 'episode', season_number: 1, episode_number: 3 }),
      makeMyRequest(4, { request_scope: 'all' })
    ]);

    const container = RequestsPage({ view: 'list' });
    await flush();

    const labels = Array.from(container.querySelectorAll('.my-request-card .request-card-scope'))
      .map(el => el.textContent);
    expect(labels).toEqual(['Komplette Serie', 'Staffel 2', 'S01E03', 'Ganzer Film']);
  });
});
