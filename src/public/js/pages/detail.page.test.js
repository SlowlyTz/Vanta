import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaApi } from '../api/media.api.js';
import DetailPage from './detail.page.js';

vi.mock('../api/media.api.js', () => ({
  MediaApi: {
    getItem: vi.fn(),
    getSimilar: vi.fn(),
    getSeasons: vi.fn(),
    getEpisodes: vi.fn(),
    favoriteItem: vi.fn(),
    unfavoriteItem: vi.fn()
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

  it('renders the heart-container favorite control for a Movie with the initial state from UserData.IsFavorite', async () => {
    MediaApi.getItem.mockResolvedValue(createBaseItem({ UserData: { IsFavorite: true } }));

    const container = DetailPage({ id: 'item-1' });
    await flush();

    const heart = container.querySelector('.heart-container');
    const checkbox = heart.querySelector('.checkbox');
    expect(heart).toBeTruthy();
    expect(checkbox.checked).toBe(true);
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
