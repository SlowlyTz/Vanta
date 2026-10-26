import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../../../src/public/js/api/media.api.js';
import { saveRouteState, markReturnFromDetail } from '../../../src/public/js/utils/routeState.js';
import { WatchlistApi } from '../../../src/public/js/api/watchlist.api.js';
import HomePage from '../../../src/public/js/pages/home.page.js';

vi.mock('../../../src/public/js/api/watchlist.api.js', () => ({
  WatchlistApi: { list: vi.fn(async () => ({ items: [] })), ids: vi.fn(async () => ({ ids: [] })) }
}));

vi.mock('../../../src/public/js/api/media.api.js', () => ({
  MediaApi: {
    getHome: vi.fn(),
    getHomeSectionGroup: vi.fn()
  }
}));

function makeItem(id) {
  return { Id: id, Name: `Movie ${id}`, Type: 'Movie', ProductionYear: 2020 };
}

async function flushPromises(count = 6) {
  for (let i = 0; i < count; i++) {
    await Promise.resolve();
  }
}

describe('HomePage restore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    window.location.hash = '#/home';
    MediaApi.getHomeSectionGroup.mockResolvedValue({ sections: [] });
  });

  it('fetches fresh data and caches it when there is no return marker', async () => {
    let resolveHome;
    MediaApi.getHome.mockReturnValue(new Promise(resolve => { resolveHome = resolve; }));

    const container = HomePage();
    expect(container.querySelector('.section-loader')).toBeTruthy();
    expect(container.getAttribute('aria-busy')).toBe('true');

    resolveHome({ movies: [makeItem('h1')], series: [], resume: [] });
    await flushPromises();

    expect(MediaApi.getHome).toHaveBeenCalledTimes(1);
    expect(MediaApi.getHomeSectionGroup).toHaveBeenCalledTimes(4);
    expect(container.textContent).not.toContain('Startseite wird geladen');
    expect(container.hasAttribute('aria-busy')).toBe(false);
    const cached = JSON.parse(sessionStorage.getItem('vantaRouteState:#/home'));
    expect(cached.data.hero).toEqual([makeItem('h1')]);
  });

  it('reuses the cached data model and skips reshuffling when returning from a detail page', async () => {
    saveRouteState('#/home', { data: { hero: [], resume: [makeItem('a'), makeItem('b')], sections: [] } });
    markReturnFromDetail({ scrollY: 555, itemId: 'a' });

    const container = HomePage();
    await flushPromises(2);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();

    // the scroll is restored once the router has attached the page
    document.body.appendChild(container);
    await new Promise(resolve => setTimeout(resolve, 60));

    expect(MediaApi.getHome).not.toHaveBeenCalled();
    expect(MediaApi.getHomeSectionGroup).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
    container.remove();
  });

  it('returning after watching: the page comes back, "Weiter schauen" comes fresh', async () => {
    saveRouteState('#/home', { data: { hero: [], resume: [makeItem('old')], sections: [] }, savedAt: Date.now() - 1000 });
    markReturnFromDetail({ scrollY: 0, itemId: 'old' });
    window.location.hash = '#/player/old';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.location.hash = '#/home';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    MediaApi.getHome.mockResolvedValue({ movies: [], series: [], resume: [makeItem('next')] });

    const container = HomePage();
    document.body.appendChild(container);
    await flushPromises(10);

    expect(MediaApi.getHome).toHaveBeenCalledTimes(1);
    expect(MediaApi.getHomeSectionGroup).not.toHaveBeenCalled();
    const ids = [...container.querySelectorAll('[data-resume-row] [data-item-id]')].map(card => card.dataset.itemId);
    expect(ids).toEqual(['next']);
    container.remove();
  });

  it('falls back to a fresh fetch when a marker exists but no data is cached', async () => {
    markReturnFromDetail({ scrollY: 100, itemId: 'a' });
    MediaApi.getHome.mockResolvedValue({ movies: [makeItem('x')], series: [], resume: [] });

    HomePage();
    await flushPromises();

    expect(MediaApi.getHome).toHaveBeenCalledTimes(1);
  });

  it('shows hero and carousel skeletons until the home data arrives', async () => {
    let resolveHome;
    MediaApi.getHome.mockReturnValue(new Promise(resolve => { resolveHome = resolve; }));
    MediaApi.getHomeSectionGroup.mockResolvedValue({ sections: [] });

    const container = HomePage();
    await flushPromises();

    expect(container.querySelector('.home-hero-skeleton')).toBeTruthy();
    expect(container.querySelectorAll('.skeleton-carousel').length).toBeGreaterThanOrEqual(5);
    expect(container.textContent).toContain('Startseite wird geladen');

    resolveHome({ movies: [], series: [], resume: [] });
    await flushPromises();

    expect(container.querySelector('.home-hero-skeleton')).toBeNull();
  });

  it('leaves out a section with no items, even with an emptyMessage', async () => {
    MediaApi.getHome.mockResolvedValue({ movies: [], series: [], resume: [] });
    MediaApi.getHomeSectionGroup.mockImplementation(group => {
      if (group !== 'now-playing') return Promise.resolve({ sections: [] });
      return Promise.resolve({
        sections: [{
          type: 'standard',
          title: 'Jetzt im Kino',
          href: '#/movies',
          items: [],
          emptyMessage: 'Keine aktuellen Kinofilme in deiner Mediathek.'
        }]
      });
    });

    const container = HomePage();
    await flushPromises();

    expect(container.textContent).not.toContain('Jetzt im Kino');
    expect(container.textContent).not.toContain('Keine aktuellen Kinofilme');
  });

  it('still skips a section with no items and no emptyMessage', async () => {
    MediaApi.getHome.mockResolvedValue({ movies: [], series: [], resume: [] });
    MediaApi.getHomeSectionGroup.mockImplementation(group => {
      if (group !== 'genres') return Promise.resolve({ sections: [] });
      return Promise.resolve({
        sections: [{ type: 'standard', title: 'Empty Genre', href: '#/genre/Empty', items: [] }]
      });
    });

    const container = HomePage();
    await flushPromises();

    expect(container.textContent).not.toContain('Empty Genre');
    expect(container.querySelector('.media-section-empty')).toBeNull();
  });

  it('shows section-local loaders while section groups are still loading', async () => {
    MediaApi.getHome.mockResolvedValue({ movies: [makeItem('h1')], series: [], resume: [] });
    MediaApi.getHomeSectionGroup.mockReturnValue(new Promise(() => {}));

    const container = HomePage();
    await flushPromises();

    expect(container.querySelectorAll('.media-section-loading')).toHaveLength(4);
    expect(container.textContent).toContain('Aktuelle Kinofilme werden geladen');
    expect(container.textContent).toContain('Kategorien werden geladen');
  });
});

describe('HomePage "Meine Liste"', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    window.location.hash = '#/home';
    MediaApi.getHomeSectionGroup.mockResolvedValue({ sections: [] });
    MediaApi.getHome.mockResolvedValue({ movies: [makeItem('h1')], series: [], resume: [makeItem('r1')] });
  });

  it('shows the row after "Weiter schauen" when the list has entries', async () => {
    WatchlistApi.list.mockResolvedValue({ items: [makeItem('w1')] });

    const container = HomePage();
    await flushPromises(10);

    const titles = [...container.querySelectorAll('.carousel-title-text')].map(el => el.textContent);
    expect(titles.slice(0, 2)).toEqual(['Weiter schauen', 'Meine Liste']);
  });

  it('leaves the row out when the list is empty or cannot be loaded', async () => {
    WatchlistApi.list.mockRejectedValue(new Error('offline'));

    const container = HomePage();
    await flushPromises(10);

    expect(container.textContent).not.toContain('Meine Liste');
    expect(container.textContent).toContain('Weiter schauen');
  });
});

describe('pickHeroItems', () => {
  const item = (id, extra = {}) => ({ Id: id, ...extra });
  const complete = id => item(id, { BackdropImageTags: ['b'], Overview: 'Text' });

  it('prefers titles with a backdrop and a text', async () => {
    const { pickHeroItems } = await import('../../../src/public/js/pages/home.page.js');
    const picked = pickHeroItems([complete('a'), item('bare'), complete('b'), complete('c')]);
    expect(picked.map(entry => entry.Id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('falls back to every title when too few are complete', async () => {
    const { pickHeroItems } = await import('../../../src/public/js/pages/home.page.js');
    expect(pickHeroItems([complete('a'), item('b'), item('c')])).toHaveLength(3);
  });
});
