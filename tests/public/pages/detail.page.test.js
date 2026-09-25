import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaApi } from '../../../src/public/js/api/media.api.js';
import DetailPage from '../../../src/public/js/pages/detail.page.js';
import { prefetchDetail, resetDetailPrefetch } from '../../../src/public/js/utils/prefetch.js';

vi.mock('../../../src/public/js/api/media.api.js', () => ({
  MediaApi: {
    getItem: vi.fn(),
    getSimilar: vi.fn(),
    getSeasons: vi.fn(),
    getEpisodes: vi.fn(),
    favoriteItem: vi.fn(),
    unfavoriteItem: vi.fn(),
    markPlayed: vi.fn(),
    markUnplayed: vi.fn()
  }
}));

function createBaseItem(overrides = {}) {
  return {
    Id: 'item-1',
    Type: 'Movie',
    Name: 'Test Movie',
    Overview: 'A test movie.',
    ProductionYear: 2024,
    UserData: { IsFavorite: false },
    ...overrides
  };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('DetailPage favorite button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MediaApi.getSimilar.mockResolvedValue([]);
    MediaApi.getSeasons.mockResolvedValue([]);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('shows a local section loader while fetching and removes it once rendered', async () => {
    let resolveItem;
    MediaApi.getItem.mockReturnValue(new Promise(resolve => { resolveItem = resolve; }));

    const container = DetailPage({ id: 'item-1' });
    expect(container.querySelector('.section-loader')).toBeTruthy();
    expect(container.getAttribute('aria-busy')).toBe('true');

    resolveItem(createBaseItem());
    await flush();

    expect(container.querySelector('.section-loader')).toBeNull();
    expect(container.hasAttribute('aria-busy')).toBe(false);
  });

  it('renders the heart-container favorite control for a Movie with the initial state from UserData.IsFavorite', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ UserData: { IsFavorite: true } }));

    const container = DetailPage({ id: 'item-1' });
    await flush();

    const heart = container.querySelector('.heart-container');
    const checkbox = heart.querySelector('.checkbox');
    expect(heart).toBeTruthy();
    expect(checkbox.checked).toBe(true);
  });

  it('renders the played toggle for a Movie and marks it through the API', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ UserData: { IsFavorite: false, Played: false } }));
    MediaApi.markPlayed.mockResolvedValue({ played: true });

    const container = DetailPage({ id: 'item-1' });
    await flush();

    const toggle = container.querySelector('.detail-actions .played-toggle');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Als gesehen markieren');

    toggle.click();
    document.querySelector('.confirm-dialog-confirm').click();
    await flush();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(MediaApi.markPlayed).toHaveBeenCalledWith('item-1');
  });

  it('does not render the played toggle for a Series', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ Type: 'Series' }));
    MediaApi.getSeasons.mockResolvedValue([]);

    const container = DetailPage({ id: 'item-1' });
    await flush();

    expect(container.querySelector('.detail-actions .played-toggle')).toBeNull();
  });

  it('does not render the favorite control for unsupported item types', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ Type: 'Episode', SeriesName: 'Some Series' }));

    const container = DetailPage({ id: 'item-1' });
    await flush();

    expect(container.querySelector('.heart-container')).toBeNull();
  });

  it('optimistically checks the box and calls MediaApi.favoriteItem', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ UserData: { IsFavorite: false } }));
    MediaApi.favoriteItem.mockResolvedValue({ isFavorite: true });

    const container = DetailPage({ id: 'item-1' });
    document.body.appendChild(container);
    await flush();

    const checkbox = container.querySelector('.heart-container .checkbox');
    checkbox.click();

    expect(checkbox.checked).toBe(true);
    await flush();

    expect(MediaApi.favoriteItem).toHaveBeenCalledWith('item-1');
    expect(checkbox.checked).toBe(true);
  });

  it('unchecks the box and calls MediaApi.unfavoriteItem', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ UserData: { IsFavorite: true } }));
    MediaApi.unfavoriteItem.mockResolvedValue({ isFavorite: false });

    const container = DetailPage({ id: 'item-1' });
    document.body.appendChild(container);
    await flush();

    const checkbox = container.querySelector('.heart-container .checkbox');
    checkbox.click();
    await flush();

    expect(MediaApi.unfavoriteItem).toHaveBeenCalledWith('item-1');
    expect(checkbox.checked).toBe(false);
  });

  it('reverts the optimistic update when the API call fails', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ UserData: { IsFavorite: false } }));
    MediaApi.favoriteItem.mockRejectedValue(new Error('network error'));

    const container = DetailPage({ id: 'item-1' });
    document.body.appendChild(container);
    await flush();

    const checkbox = container.querySelector('.heart-container .checkbox');
    checkbox.click();
    expect(checkbox.checked).toBe(true);

    await flush();

    expect(checkbox.checked).toBe(false);
  });
});

describe('DetailPage prefetch cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDetailPrefetch();
    MediaApi.getSimilar.mockResolvedValue([]);
    MediaApi.getSeasons.mockResolvedValue([]);
  });

  afterEach(() => {
    resetDetailPrefetch();
    document.body.innerHTML = '';
  });

  it('renders from the prefetched bundle without calling MediaApi.getItem', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ Name: 'Prefetched Movie' }));
    await prefetchDetail('item-1');
    MediaApi.getItem.mockClear();
    MediaApi.getSimilar.mockClear();

    const container = DetailPage({ id: 'item-1' });
    await flush();

    expect(container.textContent).toContain('Prefetched Movie');
    expect(MediaApi.getItem).not.toHaveBeenCalled();
    expect(MediaApi.getSimilar).not.toHaveBeenCalled();
  });

  it('waits for a still running prefetch instead of requesting the item again', async () => {
    let resolveItem;
    MediaApi.getItem.mockReturnValue(new Promise(resolve => { resolveItem = resolve; }));
    const prefetched = prefetchDetail('item-1');
    await flush();

    const container = DetailPage({ id: 'item-1' });
    expect(container.querySelector('.section-loader')).toBeTruthy();

    resolveItem(createBaseItem({ Name: 'Late Movie' }));
    await prefetched;
    await flush();

    expect(container.textContent).toContain('Late Movie');
    expect(MediaApi.getItem).toHaveBeenCalledTimes(1);
  });

  it('falls back to its own request when the prefetch failed', async () => {
    MediaApi.getItem.mockRejectedValueOnce(new Error('offline'));
    const prefetched = prefetchDetail('item-1');
    await prefetched.catch(() => {});
    MediaApi.getItem.mockResolvedValue(createBaseItem({ Name: 'Fresh Movie' }));

    const container = DetailPage({ id: 'item-1' });
    await flush();

    expect(container.textContent).toContain('Fresh Movie');
    expect(MediaApi.getItem).toHaveBeenCalledTimes(2);
  });

  it('requests the item itself when nothing was prefetched', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem());

    DetailPage({ id: 'item-1' });
    await flush();

    expect(MediaApi.getItem).toHaveBeenCalledWith('item-1');
  });
});

describe('DetailPage help links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MediaApi.getSimilar.mockResolvedValue([]);
    MediaApi.getSeasons.mockResolvedValue([]);
  });

  it('offers to report a problem with a movie', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem());
    const container = DetailPage({ id: 'item-1' });
    await flush();

    const links = [...container.querySelectorAll('.detail-help-link')];
    expect(links.map(link => link.textContent)).toEqual(['Problem melden']);
    expect(links[0].getAttribute('href')).toBe('#/report?item=item-1');
  });

  it('also offers to request missing seasons of a series with a TMDB id', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ Id: 'series-1', Type: 'Series', ProviderIds: { Tmdb: '95396' } }));
    const container = DetailPage({ id: 'series-1' });
    await flush();

    const links = [...container.querySelectorAll('.detail-help-link')];
    expect(links.map(link => link.textContent)).toEqual(['Weitere Staffeln anfragen', 'Problem melden']);
    expect(links[0].getAttribute('href')).toBe('#/request-detail/tv/95396');
    expect(links[1].getAttribute('href')).toBe('#/report?item=series-1');
  });

  it('leaves the season request out when the series has no TMDB id', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ Id: 'series-1', Type: 'Series' }));
    const container = DetailPage({ id: 'series-1' });
    await flush();

    expect([...container.querySelectorAll('.detail-help-link')].map(link => link.textContent)).toEqual(['Problem melden']);
  });

  it('shows no help links for an episode', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ Type: 'Episode' }));
    const container = DetailPage({ id: 'item-1' });
    await flush();

    expect(container.querySelector('.detail-help-links')).toBeNull();
  });
});
