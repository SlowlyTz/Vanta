import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../api/media.api.js';
import ProfilePage from './profile.page.js';

vi.mock('../api/media.api.js', () => ({
  MediaApi: {
    getProfileContinueWatching: vi.fn(),
    getProfileHistory: vi.fn(),
    getProfileFavorites: vi.fn()
  }
}));

function makeItem(id) {
  return { Id: id, Name: `Movie ${id}`, Type: 'Movie', ProductionYear: 2020 };
}

function makeSeries(id) {
  return { Id: id, Name: `Series ${id}`, Type: 'Series', ChildCount: 2 };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads Weiter ansehen initially', async () => {
    MediaApi.getProfileContinueWatching.mockResolvedValue({
      items: [makeItem('1')], page: 1, limit: 24, totalItems: 1, totalPages: 1
    });

    ProfilePage();
    await flush();

    expect(MediaApi.getProfileContinueWatching).toHaveBeenCalledWith(1, 24);
    expect(MediaApi.getProfileHistory).not.toHaveBeenCalled();
    expect(MediaApi.getProfileFavorites).not.toHaveBeenCalled();
  });

  it('loads favorites initially when initialTab is favorites', async () => {
    MediaApi.getProfileFavorites.mockResolvedValue({
      items: [makeItem('1')], page: 1, limit: 24, totalItems: 1, totalPages: 1
    });

    const container = ProfilePage({ initialTab: 'favorites' });
    await flush();

    expect(MediaApi.getProfileFavorites).toHaveBeenCalledWith(1, 24);
    expect(MediaApi.getProfileContinueWatching).not.toHaveBeenCalled();
    expect(MediaApi.getProfileHistory).not.toHaveBeenCalled();

    const activeButton = container.querySelector('.profile-tab-button.active');
    expect(activeButton.textContent).toBe('Favoriten');
  });

  it('falls back to Weiter ansehen when initialTab is unknown', async () => {
    MediaApi.getProfileContinueWatching.mockResolvedValue({
      items: [], page: 1, limit: 24, totalItems: 0, totalPages: 1
    });

    ProfilePage({ initialTab: 'not-a-real-tab' });
    await flush();

    expect(MediaApi.getProfileContinueWatching).toHaveBeenCalledWith(1, 24);
  });

  it('shows only the tab-content loader while header and tabs stay visible', async () => {
    let resolveContinue;
    MediaApi.getProfileContinueWatching.mockReturnValue(new Promise(resolve => { resolveContinue = resolve; }));

    const container = ProfilePage();

    expect(container.querySelector('.profile-title').textContent).toBe('Profil');
    expect(container.querySelectorAll('.profile-tab-button')).toHaveLength(3);
    expect(container.querySelector('.profile-tab-content .section-loader')).toBeTruthy();
    expect(container.querySelector('.profile-tab-content').getAttribute('aria-busy')).toBe('true');

    resolveContinue({ items: [makeItem('1')], page: 1, limit: 24, totalItems: 1, totalPages: 1 });
    await flush();

    expect(container.querySelector('.profile-tab-content .section-loader')).toBeNull();
    expect(container.querySelector('.profile-tab-content').hasAttribute('aria-busy')).toBe(false);
  });

  it('keeps existing cards visible and shows a button-level loading state when loading more', async () => {
    MediaApi.getProfileContinueWatching
      .mockResolvedValueOnce({ items: [makeItem('1'), makeItem('2')], page: 1, limit: 2, totalItems: 4, totalPages: 2 });

    const container = ProfilePage();
    await flush();

    let resolveNext;
    MediaApi.getProfileContinueWatching.mockReturnValue(new Promise(resolve => { resolveNext = resolve; }));
    const loadMoreBtn = container.querySelector('.profile-load-more');
    loadMoreBtn.click();

    expect(container.querySelectorAll('.media-card')).toHaveLength(2);
    expect(container.querySelector('.profile-load-more').disabled).toBe(true);
    expect(container.querySelector('.profile-load-more').getAttribute('aria-busy')).toBe('true');

    resolveNext({ items: [makeItem('3'), makeItem('4')], page: 2, limit: 2, totalItems: 4, totalPages: 2 });
    await flush();

    expect(container.querySelectorAll('.media-card')).toHaveLength(4);
  });

  it('loads the History tab only when clicked', async () => {
    MediaApi.getProfileContinueWatching.mockResolvedValue({ items: [], page: 1, limit: 24, totalItems: 0, totalPages: 0 });
    MediaApi.getProfileHistory.mockResolvedValue({ items: [makeItem('2')], page: 1, limit: 24, totalItems: 1, totalPages: 1 });

    const container = ProfilePage();
    await flush();

    expect(MediaApi.getProfileHistory).not.toHaveBeenCalled();

    const historyButton = Array.from(container.querySelectorAll('.profile-tab-button')).find(b => b.textContent === 'History');
    historyButton.click();
    await flush();

    expect(MediaApi.getProfileHistory).toHaveBeenCalledWith(1, 24);
    expect(container.querySelectorAll('.media-card')).toHaveLength(1);
  });

  it('renders one series card per grouped series in Weiter ansehen and navigates to its detail route', async () => {
    MediaApi.getProfileContinueWatching.mockResolvedValue({
      items: [makeSeries('s1'), makeItem('1')], page: 1, limit: 24, totalItems: 2, totalPages: 1
    });

    const container = ProfilePage();
    await flush();

    const cards = container.querySelectorAll('.media-card');
    expect(cards).toHaveLength(2);

    const seriesCard = Array.from(cards).find(c => c.querySelector('.media-card-badge')?.textContent === 'SERIE');
    expect(seriesCard).toBeTruthy();
    expect(seriesCard.textContent).not.toMatch(/S\d{2}E\d{2}/);

    seriesCard.click();
    expect(window.location.hash).toBe('#/item/s1');
  });

  it('renders one series card per grouped series in History and navigates to its detail route', async () => {
    MediaApi.getProfileContinueWatching.mockResolvedValue({ items: [], page: 1, limit: 24, totalItems: 0, totalPages: 0 });
    MediaApi.getProfileHistory.mockResolvedValue({
      items: [makeSeries('s2')], page: 1, limit: 24, totalItems: 1, totalPages: 1
    });

    const container = ProfilePage();
    await flush();

    const historyButton = Array.from(container.querySelectorAll('.profile-tab-button')).find(b => b.textContent === 'History');
    historyButton.click();
    await flush();

    const seriesCard = container.querySelector('.media-card');
    expect(seriesCard.querySelector('.media-card-badge').textContent).toBe('SERIE');

    seriesCard.click();
    expect(window.location.hash).toBe('#/item/s2');
  });

  it('loads the Favoriten tab when clicked', async () => {
    MediaApi.getProfileContinueWatching.mockResolvedValue({ items: [], page: 1, limit: 24, totalItems: 0, totalPages: 0 });
    MediaApi.getProfileFavorites.mockResolvedValue({ items: [makeItem('3')], page: 1, limit: 24, totalItems: 1, totalPages: 1 });

    const container = ProfilePage();
    await flush();

    const favButton = Array.from(container.querySelectorAll('.profile-tab-button')).find(b => b.textContent === 'Favoriten');
    favButton.click();
    await flush();

    expect(MediaApi.getProfileFavorites).toHaveBeenCalledWith(1, 24);
    expect(container.querySelectorAll('.media-card')).toHaveLength(1);
  });

  it('shows an empty state when a tab has no items', async () => {
    MediaApi.getProfileContinueWatching.mockResolvedValue({ items: [], page: 1, limit: 24, totalItems: 0, totalPages: 0 });

    const container = ProfilePage();
    await flush();

    expect(container.textContent).toContain('Du hast aktuell keine begonnenen Inhalte.');
  });

  it('appends further items when "Mehr laden" is clicked', async () => {
    MediaApi.getProfileContinueWatching
      .mockResolvedValueOnce({ items: [makeItem('1'), makeItem('2')], page: 1, limit: 2, totalItems: 4, totalPages: 2 })
      .mockResolvedValueOnce({ items: [makeItem('3'), makeItem('4')], page: 2, limit: 2, totalItems: 4, totalPages: 2 });

    const container = ProfilePage();
    await flush();

    expect(container.querySelectorAll('.media-card')).toHaveLength(2);

    const loadMoreBtn = container.querySelector('.profile-load-more');
    expect(loadMoreBtn).toBeTruthy();
    loadMoreBtn.click();
    await flush();

    expect(MediaApi.getProfileContinueWatching).toHaveBeenLastCalledWith(2, 24);
    expect(container.querySelectorAll('.media-card')).toHaveLength(4);
    expect(container.querySelector('.profile-load-more')).toBeNull();
  });
});
