import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaApi } from '../api/media.api.js';
import TrailerScrollerPage from './trailer-scroller.page.js';
import { INTRO_SEEN_KEY } from './trailer-scroller.state.js';

const playerMocks = vi.hoisted(() => ({
  createPlayer: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  destroy: vi.fn(),
  destroyAll: vi.fn()
}));

vi.mock('../api/media.api.js', () => ({
  MediaApi: {
    getTrailers: vi.fn(),
    favoriteItem: vi.fn(),
    unfavoriteItem: vi.fn()
  }
}));

vi.mock('../store/app.store.js', () => ({
  appStore: {
    showToast: vi.fn()
  }
}));

vi.mock('./trailer-scroller/player.js', () => ({
  YouTubePlayerManager: class {
    constructor() {
      this.players = new Map();
      this.pending = new Map();
    }

    createPlayer(...args) {
      return playerMocks.createPlayer(...args);
    }

    play(...args) {
      return playerMocks.play(...args);
    }

    pause(...args) {
      return playerMocks.pause(...args);
    }

    destroy(...args) {
      return playerMocks.destroy(...args);
    }

    destroyAll(...args) {
      return playerMocks.destroyAll(...args);
    }
  }
}));

class FakeIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
}

function makeTrailer(overrides = {}) {
  return {
    id: 'trailer-1',
    itemId: 'item-1',
    itemType: 'Movie',
    typeLabel: 'Film',
    title: 'Dune: Part Two',
    overview: 'Paul Atreides vereint sich mit Chani und den Fremen.',
    year: 2024,
    fsk: 'FSK 12',
    rating: 8.3,
    youtubeVideoId: 'youtube-1',
    isFavorite: false,
    ...overrides
  };
}

async function mountScroller() {
  const page = TrailerScrollerPage();
  document.body.appendChild(page);
  await vi.runAllTimersAsync();
  return page;
}

describe('TrailerScrollerPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    HTMLElement.prototype.scrollTo = vi.fn();
    window.location.hash = '#/scroller';
    sessionStorage.clear();
    sessionStorage.setItem(INTRO_SEEN_KEY, 'true');

    playerMocks.createPlayer.mockImplementation(async (containerId, videoId, options) => {
      options.onReady?.();
      return { containerId, videoId };
    });
  });

  afterEach(() => {
    window.location.hash = '#/home';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    document.body.innerHTML = '';
    document.documentElement.classList.remove('trailer-scroller-active');
    document.body.classList.remove('trailer-scroller-active');
    document.body.style.top = '';
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps VANTA actions outside the native YouTube video surface', async () => {
    MediaApi.getTrailers.mockResolvedValue({
      items: [makeTrailer()],
      nextCursor: null,
      hasMore: false
    });

    const page = await mountScroller();

    expect(page.querySelector('.trailer-scroller-title')?.textContent).toBe('Trailer entdecken');
    expect(page.querySelector('.trailer-video-container .trailer-action')).toBeNull();
    expect(page.querySelectorAll('.trailer-info .trailer-action')).toHaveLength(3);
    expect(Array.from(page.querySelectorAll('.trailer-action-label')).map(el => el.textContent))
      .toEqual(['Favorit', 'Details', 'Teilen']);
    expect(playerMocks.createPlayer).toHaveBeenCalledWith(
      expect.any(String),
      'youtube-1',
      expect.objectContaining({ autoplay: 1, muted: false })
    );
  });

  it('shows an inline retry state instead of an empty page when loading fails', async () => {
    MediaApi.getTrailers.mockRejectedValue(new Error('Jellyfin nicht erreichbar'));

    const page = await mountScroller();

    expect(page.querySelector('.trailer-error-state')).toBeTruthy();
    expect(page.textContent).toContain('Trailer konnten nicht geladen werden');
    expect(page.textContent).toContain('Erneut versuchen');
  });

  it('scrolls the requested slide into view when the header navigation is used', async () => {
    MediaApi.getTrailers.mockResolvedValue({
      items: [makeTrailer(), makeTrailer({ id: 'trailer-2', itemId: 'item-2', title: 'The Batman' })],
      nextCursor: null,
      hasMore: false
    });

    const page = await mountScroller();
    const slides = page.querySelectorAll('.trailer-slide');
    const track = page.querySelector('.trailer-scroller-track');
    const trackScroll = vi.fn();
    track.scrollTo = trackScroll;
    Object.defineProperty(slides[1], 'offsetTop', { configurable: true, value: 640 });

    page.querySelector('.trailer-nav-next').click();

    expect(trackScroll).toHaveBeenCalledWith({ behavior: 'smooth', top: 640 });
    expect(page.querySelector('.trailer-nav-previous').disabled).toBe(false);
  });
});
