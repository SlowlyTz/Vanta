import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../../../src/public/js/api/media.api.js';
import { WatchlistApi } from '../../../src/public/js/api/watchlist.api.js';
import ProfilePage, { formatWatchTime, viewFromHash } from '../../../src/public/js/pages/profile.page.js';

vi.mock('../../../src/public/js/api/watchlist.api.js', () => ({
  WatchlistApi: { list: vi.fn(), ids: vi.fn(async () => ({ ids: [] })) }
}));

vi.mock('../../../src/public/js/api/media.api.js', () => ({
  MediaApi: {
    getProfileContinueWatching: vi.fn(),
    getProfileHistory: vi.fn(),
    getProfileFavorites: vi.fn(),
    getProfileStats: vi.fn()
  }
}));

function makeItem(id) {
  return { Id: id, Name: `Movie ${id}`, Type: 'Movie', ProductionYear: 2020 };
}

function makeSeries(id) {
  return { Id: id, Name: `Series ${id}`, Type: 'Series', ChildCount: 2 };
}

const page = (items = [], extra = {}) => ({ items, page: 1, limit: 24, totalItems: items.length, totalPages: 1, ...extra });

async function flush() {
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
}

const STATS = { movies: 42, episodes: 1211, series: 6, minutes: 7700, topGenres: ['Drama', 'Krimi'], lastWatched: makeItem('last') };

beforeEach(() => {
  vi.clearAllMocks();
  MediaApi.getProfileStats.mockResolvedValue(STATS);
  MediaApi.getProfileContinueWatching.mockResolvedValue(page());
  MediaApi.getProfileHistory.mockResolvedValue(page());
  MediaApi.getProfileFavorites.mockResolvedValue(page());
  WatchlistApi.list.mockResolvedValue({ items: [] });
});

describe('profile addresses', () => {
  it('tells the overview from the whole lists', () => {
    expect(viewFromHash('#/profile')).toBe('overview');
    expect(viewFromHash('#/profile?tab=continue')).toBe('continue');
    expect(viewFromHash('#/profile?tab=history')).toBe('history');
    expect(viewFromHash('#/watchlist')).toBe('watchlist');
    expect(viewFromHash('#/favorites')).toBe('favorites');
    expect(viewFromHash('#/home')).toBeNull();
  });

  it('writes watch time in minutes, hours or days', () => {
    expect(formatWatchTime(45)).toBe('45 Min.');
    expect(formatWatchTime(7700)).toBe('128 Std.');
    expect(formatWatchTime(75000)).toBe('52 Tage');
    expect(formatWatchTime(undefined)).toBe('–');
  });
});

describe('ProfilePage overview', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/profile');
  });

  it('shows the name, the numbers and the favourite genres', async () => {
    const container = ProfilePage();
    expect(container.querySelector('.profile-stats').classList.contains('is-loading')).toBe(true);
    await flush();

    expect(container.querySelector('.profile-name').textContent).toBeTruthy();
    expect([...container.querySelectorAll('.profile-stat-value')].map(value => value.textContent)).toEqual(['42', '1.211', '6', '128 Std.']);
    expect(container.querySelector('.profile-genres').textContent).toBe('Am liebsten: Drama · Krimi');
    expect(container.querySelector('.profile-last').textContent).toBe('Zuletzt gesehen: Movie last');
    expect(container.querySelector('.profile-stats').classList.contains('is-loading')).toBe(false);
  });

  it('links each whole list from the head', () => {
    const container = ProfilePage();
    expect([...container.querySelectorAll('.profile-shortcut')].map(link => link.getAttribute('href')))
      .toEqual(['#/profile?tab=continue', '#/watchlist', '#/favorites', '#/profile?tab=history']);
  });

  it('shows a row for each list that has titles, in order, and none for empty ones', async () => {
    MediaApi.getProfileContinueWatching.mockResolvedValue(page([makeSeries('s1')]));
    MediaApi.getProfileHistory.mockResolvedValue(page([makeItem('h1'), makeItem('h2')]));
    const container = ProfilePage();
    await flush();

    expect(MediaApi.getProfileContinueWatching).toHaveBeenCalledWith(1, 20, { signal: expect.any(AbortSignal) });
    const rows = [...container.querySelectorAll('[data-profile-list]')];
    expect(rows.map(row => row.dataset.profileList)).toEqual(['continue', 'history']);
    expect(rows[0].dataset.resumeRow).toBe('true');
    expect(rows[1].querySelectorAll('.media-card')).toHaveLength(2);
    expect(container.querySelector('.skeleton-carousel')).toBeNull();
    expect(container.querySelector('.profile-empty').hidden).toBe(true);
  });

  it('says so when every list is empty', async () => {
    const container = ProfilePage();
    await flush();
    expect(container.querySelector('.profile-empty').hidden).toBe(false);
  });

  it('keeps the numbers out when they cannot be loaded', async () => {
    MediaApi.getProfileStats.mockRejectedValue(new Error('down'));
    const container = ProfilePage();
    await flush();
    expect(container.querySelector('.profile-stat-value').textContent).toBe('–');
    expect(container.querySelector('.profile-genres').hidden).toBe(true);
  });

  it('builds the page anew between the overview and a list', () => {
    const container = ProfilePage();
    expect(container.handleHashChange('#/profile')).toBe(true);
    expect(container.handleHashChange('#/watchlist')).toBe(false);
    expect(container.handleHashChange('#/home')).toBe(false);
  });
});

describe('ProfilePage lists', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/profile?tab=continue');
  });

  it('opens Weiter schauen whole from its address', async () => {
    MediaApi.getProfileContinueWatching.mockResolvedValue(page([makeItem('1')]));
    const container = ProfilePage();
    await flush();

    expect(MediaApi.getProfileContinueWatching).toHaveBeenCalledWith(1, 24, { signal: expect.any(AbortSignal) });
    expect(container.querySelector('.profile-list-title').textContent).toBe('Weiter schauen');
    expect(container.querySelector('.profile-tab-button.active').textContent).toBe('Weiter schauen');
    expect(container.querySelector('.profile-tab-button.active').hasAttribute('data-tv-autofocus')).toBe(true);
    expect(container.querySelector('.profile-hero')).toBeNull();
    expect(MediaApi.getProfileHistory).not.toHaveBeenCalled();
  });

  it('opens favorites when the route asks for them', async () => {
    window.history.replaceState(null, '', '#/favorites');
    MediaApi.getProfileFavorites.mockResolvedValue(page([makeItem('1')]));
    const container = ProfilePage({ initialTab: 'favorites' });
    await flush();

    expect(MediaApi.getProfileFavorites).toHaveBeenCalledWith(1, 24, { signal: expect.any(AbortSignal) });
    expect(container.querySelector('.profile-tab-button.active').textContent).toBe('Favoriten');
  });

  it('shows only the content loader while the head and the tabs stay', async () => {
    let resolveContinue;
    MediaApi.getProfileContinueWatching.mockReturnValue(new Promise(resolve => { resolveContinue = resolve; }));
    const container = ProfilePage();

    expect(container.querySelectorAll('.profile-tab-button')).toHaveLength(4);
    expect(container.querySelector('.profile-tab-content .section-loader')).toBeTruthy();
    expect(container.querySelector('.profile-tab-content').getAttribute('aria-busy')).toBe('true');

    resolveContinue(page([makeItem('1')]));
    await flush();

    expect(container.querySelector('.profile-tab-content .section-loader')).toBeNull();
    expect(container.querySelector('.profile-tab-content').hasAttribute('aria-busy')).toBe(false);
  });

  it('appends more and keeps the cards while it loads', async () => {
    MediaApi.getProfileContinueWatching.mockResolvedValueOnce(page([makeItem('1'), makeItem('2')], { totalItems: 4, totalPages: 2 }));
    const container = ProfilePage();
    await flush();

    let resolveNext;
    MediaApi.getProfileContinueWatching.mockReturnValue(new Promise(resolve => { resolveNext = resolve; }));
    container.querySelector('.profile-load-more').click();

    expect(container.querySelectorAll('.media-card')).toHaveLength(2);
    expect(container.querySelector('.profile-load-more').disabled).toBe(true);

    resolveNext(page([makeItem('3'), makeItem('4')], { page: 2, totalItems: 4, totalPages: 2 }));
    await flush();

    expect(MediaApi.getProfileContinueWatching).toHaveBeenLastCalledWith(2, 24, { signal: expect.any(AbortSignal) });
    expect(container.querySelectorAll('.media-card')).toHaveLength(4);
    expect(container.querySelector('.profile-load-more')).toBeNull();
  });

  it('switches lists in place and loads each only when chosen', async () => {
    MediaApi.getProfileHistory.mockResolvedValue(page([makeSeries('s2')]));
    const container = ProfilePage();
    await flush();
    expect(MediaApi.getProfileHistory).not.toHaveBeenCalled();

    [...container.querySelectorAll('.profile-tab-button')].find(button => button.textContent === 'Verlauf').click();
    await flush();

    expect(MediaApi.getProfileHistory).toHaveBeenCalledWith(1, 24, { signal: expect.any(AbortSignal) });
    const card = container.querySelector('.media-card');
    expect(card.querySelector('.media-card-badge').textContent).toBe('SERIE');
    expect(card.getAttribute('href')).toBe('#/item/s2');
    expect(container.querySelector('.profile-list-title').textContent).toBe('Verlauf');
  });

  it('keeps its own hash changes between lists', () => {
    const container = ProfilePage();
    expect(container.handleHashChange('#/favorites')).toBe(true);
    expect(container.querySelector('.profile-tab-button.active').textContent).toBe('Favoriten');
    expect(container.handleHashChange('#/profile')).toBe(false);
    expect(container.handleHashChange('#/home')).toBe(false);
  });

  it('shows "Meine Liste" whole, and explains an empty one', async () => {
    window.history.replaceState(null, '', '#/watchlist');
    WatchlistApi.list.mockResolvedValue({ items: [makeItem('w1'), makeSeries('w2')] });
    let container = ProfilePage({ initialTab: 'watchlist' });
    await flush();
    expect([...container.querySelectorAll('.media-card')].map(card => card.dataset.itemId)).toEqual(['w1', 'w2']);
    expect(container.querySelector('.profile-load-more')).toBeNull();

    WatchlistApi.list.mockResolvedValue({ items: [] });
    container = ProfilePage({ initialTab: 'watchlist' });
    await flush();
    expect(container.textContent).toContain('Deine Liste ist leer');
  });
});
