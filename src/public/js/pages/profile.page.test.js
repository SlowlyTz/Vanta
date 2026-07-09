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
