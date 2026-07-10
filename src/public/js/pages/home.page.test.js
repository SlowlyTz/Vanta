import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../api/media.api.js';
import { saveRouteState, markReturnFromDetail } from '../utils/routeState.js';
import HomePage from './home.page.js';

vi.mock('../api/media.api.js', () => ({
  MediaApi: {
    getHome: vi.fn(),
    getHomeSections: vi.fn(),
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

    HomePage();
    await flushPromises(2);

    expect(MediaApi.getHome).not.toHaveBeenCalled();
    expect(MediaApi.getHomeSectionGroup).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });

  it('falls back to a fresh fetch when a marker exists but no data is cached', async () => {
    markReturnFromDetail({ scrollY: 100, itemId: 'a' });
    MediaApi.getHome.mockResolvedValue({ movies: [makeItem('x')], series: [], resume: [] });

    HomePage();
    await flushPromises();

    expect(MediaApi.getHome).toHaveBeenCalledTimes(1);
  });

  it('renders an empty-state block for a section with no items but an emptyMessage', async () => {
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

    const emptySection = container.querySelector('.media-section-empty');
    expect(emptySection).toBeTruthy();
    expect(emptySection.querySelector('.carousel-title-text').textContent).toBe('Jetzt im Kino');
    expect(emptySection.querySelector('.section-empty-message').textContent).toBe('Keine aktuellen Kinofilme in deiner Mediathek.');
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
