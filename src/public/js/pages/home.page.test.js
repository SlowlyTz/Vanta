import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../api/media.api.js';
import { saveRouteState, markReturnFromDetail } from '../utils/routeState.js';
import HomePage from './home.page.js';

vi.mock('../api/media.api.js', () => ({
  MediaApi: { getHomeSections: vi.fn() }
}));

function makeItem(id) {
  return { Id: id, Name: `Movie ${id}`, Type: 'Movie', ProductionYear: 2020 };
}

describe('HomePage restore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    window.location.hash = '#/home';
  });

  it('fetches fresh data and caches it when there is no return marker', async () => {
    let resolveSections;
    MediaApi.getHomeSections.mockReturnValue(new Promise(resolve => { resolveSections = resolve; }));

    const container = HomePage();
    expect(container.querySelector('.section-loader')).toBeTruthy();
    expect(container.getAttribute('aria-busy')).toBe('true');

    resolveSections({ hero: [makeItem('h1')], resume: [], sections: [] });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(MediaApi.getHomeSections).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.section-loader')).toBeNull();
    expect(container.hasAttribute('aria-busy')).toBe(false);
    const cached = JSON.parse(sessionStorage.getItem('vantaRouteState:#/home'));
    expect(cached.data.hero).toEqual([makeItem('h1')]);
  });

  it('reuses the cached data model and skips reshuffling when returning from a detail page', async () => {
    saveRouteState('#/home', { data: { hero: [], resume: [makeItem('a'), makeItem('b')], sections: [] } });
    markReturnFromDetail({ scrollY: 555, itemId: 'a' });

    HomePage();
    await Promise.resolve();
    await Promise.resolve();

    expect(MediaApi.getHomeSections).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });

  it('falls back to a fresh fetch when a marker exists but no data is cached', async () => {
    markReturnFromDetail({ scrollY: 100, itemId: 'a' });
    MediaApi.getHomeSections.mockResolvedValue({ hero: [makeItem('x')], resume: [], sections: [] });

    HomePage();
    await Promise.resolve();
    await Promise.resolve();

    expect(MediaApi.getHomeSections).toHaveBeenCalledTimes(1);
  });
});
