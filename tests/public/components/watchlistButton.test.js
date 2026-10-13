import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/public/js/api/watchlist.api.js', () => ({
  WatchlistApi: { add: vi.fn(), remove: vi.fn(), ids: vi.fn(), list: vi.fn() }
}));
vi.mock('../../../src/public/js/store/app.store.js', () => ({ appStore: { showToast: vi.fn() } }));

import { WatchlistApi } from '../../../src/public/js/api/watchlist.api.js';
import { appStore } from '../../../src/public/js/store/app.store.js';
import { watchlistStore } from '../../../src/public/js/store/watchlist.store.js';
import { createWatchlistButton } from '../../../src/public/js/components/watchlistButton.js';
import { MediaCard } from '../../../src/public/js/components/mediaCard.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('watchlist button and store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watchlistStore.clear();
    document.body.innerHTML = '';
  });

  it('is only offered for movies and series', () => {
    expect(createWatchlistButton({ Id: 'e1', Type: 'Episode' })).toBeNull();
    expect(createWatchlistButton({ Id: 'm1', Type: 'Movie' })).toBeTruthy();
  });

  it('adds and removes, and the label follows', async () => {
    WatchlistApi.add.mockResolvedValue({});
    WatchlistApi.remove.mockResolvedValue({});
    const button = createWatchlistButton({ Id: 'm1', Type: 'Movie' });
    expect(button.textContent).toBe('Meine Liste');
    expect(button.getAttribute('aria-label')).toBe('Meine Liste');

    button.click();
    await flush();
    expect(WatchlistApi.add).toHaveBeenCalledWith('m1');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toBe('In meiner Liste');
    expect(button.getAttribute('aria-label')).toBe('In meiner Liste');
    expect(appStore.showToast).toHaveBeenCalledWith('Zu meiner Liste hinzugefügt', 'success');

    button.click();
    await flush();
    expect(WatchlistApi.remove).toHaveBeenCalledWith('m1');
    expect(button.textContent).toBe('Meine Liste');
  });

  it('puts the state back when the server refuses', async () => {
    WatchlistApi.add.mockRejectedValue(new Error('Deine Liste ist voll'));
    const button = createWatchlistButton({ Id: 'm1', Type: 'Movie' });
    button.click();
    await flush();
    expect(watchlistStore.has('m1')).toBe(false);
    expect(appStore.showToast).toHaveBeenCalledWith('Deine Liste ist voll', 'error');
  });

  it('marks cards of titles on the list, also after a change', async () => {
    const card = MediaCard({ item: { Id: 'm2', Type: 'Movie', Name: 'Heat' } });
    document.body.appendChild(card);
    expect(card.classList.contains('in-watchlist')).toBe(false);

    WatchlistApi.add.mockResolvedValue({});
    await watchlistStore.add('m2');
    expect(card.classList.contains('in-watchlist')).toBe(true);
    expect(MediaCard({ item: { Id: 'm2', Type: 'Movie', Name: 'Heat' } }).classList.contains('in-watchlist')).toBe(true);
  });

  it('loads the ids on login', async () => {
    WatchlistApi.ids.mockResolvedValue({ ids: ['a', 'b'] });
    await watchlistStore.load();
    expect(watchlistStore.has('b')).toBe(true);
  });
});
