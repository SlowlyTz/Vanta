import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestsApi } from '../../../src/public/js/api/requests.api.js';
import { NotificationsApi } from '../../../src/public/js/api/notifications.api.js';
import RequestsPage from '../../../src/public/js/pages/requests.page.js';

vi.mock('../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: { search: vi.fn(), getMyRequests: vi.fn() }
}));
vi.mock('../../../src/public/js/api/notifications.api.js', () => ({
  NotificationsApi: { getSummary: vi.fn(), markSeen: vi.fn() }
}));
vi.mock('../../../src/public/js/store/app.store.js', () => ({ appStore: { showToast: vi.fn() } }));

async function flush() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

describe('RequestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    NotificationsApi.markSeen.mockResolvedValue({ previousSeenAt: 1000 });
  });

  afterEach(() => vi.useRealTimers());

  it('opens on "Neu anfragen" with the search focused by the router and an intro', () => {
    const container = RequestsPage();

    expect(container.querySelector('.ui-segment.is-active').textContent).toBe('Neu anfragen');
    expect(container.querySelector('.request-search input').hasAttribute('data-autofocus')).toBe(true);
    expect(container.querySelector('.request-search-empty').textContent).toContain('Was fehlt dir?');
  });

  it('switches views through the hash', () => {
    const container = RequestsPage();
    [...container.querySelectorAll('.requests-tabs .ui-segment')][1].click();
    expect(window.location.hash).toBe('#/requests/mine');
  });

  it('searches after a pause and links every hit to its request page, library titles included', async () => {
    vi.useFakeTimers();
    RequestsApi.search.mockResolvedValue([
      { id: 7, name: 'Severance', media_type: 'tv', first_air_date: '2022-02-18', exists: true, jellyfinItemId: 'jf-1' },
      { id: 8, title: 'Heat', media_type: 'movie', release_date: '1995-12-15', requested: true },
      { id: 9, title: 'Alien', media_type: 'movie', release_date: '1979-05-25', banned: true }
    ]);
    const container = RequestsPage();
    const input = container.querySelector('.request-search input');
    input.value = 'sev';
    input.dispatchEvent(new Event('input'));

    await vi.advanceTimersByTimeAsync(400);
    await flush();

    expect(RequestsApi.search).toHaveBeenCalledWith('sev');
    const hits = [...container.querySelectorAll('.request-result')];
    expect(hits.map(hit => hit.getAttribute('href'))).toEqual([
      '#/request-detail/tv/7', '#/request-detail/movie/8', '#/request-detail/movie/9'
    ]);
    expect(hits.map(hit => hit.querySelector('.request-result-status')?.textContent)).toEqual(['In Bibliothek', 'Angefragt', 'Abgelehnt']);
    expect(hits[0].querySelector('.request-result-meta').textContent).toBe('Serie · 2022');
  });

  it('says so when nothing is found', async () => {
    vi.useFakeTimers();
    RequestsApi.search.mockResolvedValue([]);
    const container = RequestsPage();
    const input = container.querySelector('.request-search input');
    input.value = 'xyz';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(400);
    await flush();

    expect(container.querySelector('.request-search-empty').textContent).toContain('Keine Treffer für „xyz“');
  });

  it('lists own requests with scope and status, marks new answers and clears the dot', async () => {
    RequestsApi.getMyRequests.mockResolvedValue([
      { id: 1, title: 'Severance', tmdb_type: 'tv', tmdb_id: 7, status: 'approved', request_scope: 'season', season_number: 2, created_at: 1, updated_at: 5000 },
      { id: 2, title: 'Heat', tmdb_type: 'movie', tmdb_id: 8, status: 'pending', request_scope: 'all', created_at: 1, updated_at: 5000 },
      { id: 3, title: 'Alien', tmdb_type: 'movie', tmdb_id: 9, status: 'rejected', request_scope: 'all', created_at: 1, updated_at: 500 }
    ]);
    const container = RequestsPage({ view: 'list' });
    await flush();

    expect(NotificationsApi.markSeen).toHaveBeenCalledWith('requests');
    const cards = [...container.querySelectorAll('.request-mine')];
    expect(cards).toHaveLength(3);
    expect(cards[0].textContent).toContain('Staffel 2');
    expect(cards.map(card => card.classList.contains('is-new'))).toEqual([true, false, false]);
    expect(cards[0].getAttribute('href')).toBe('#/request-detail/tv/7');

    [...container.querySelectorAll('.request-filters .ui-segment')].find(b => b.textContent === 'Abgelehnt').click();
    expect([...container.querySelectorAll('.request-mine strong')].map(el => el.textContent)).toEqual(['Alien']);
  });

  it('shows an empty state when there are no own requests yet', async () => {
    RequestsApi.getMyRequests.mockResolvedValue([]);
    const container = RequestsPage({ view: 'list' });
    await flush();

    expect(container.querySelector('.ui-empty').textContent).toContain('Noch keine Anfragen');
  });
});
