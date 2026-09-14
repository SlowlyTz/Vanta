import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaApi } from '../../../src/public/js/api/media.api.js';
import { saveRouteState, markReturnFromDetail, getRouteState } from '../../../src/public/js/utils/routeState.js';
import LibraryPage from '../../../src/public/js/pages/library.page.js';

vi.mock('../../../src/public/js/api/media.api.js', () => ({
  MediaApi: { getLibrary: vi.fn() }
}));

function makeItem(id) {
  return { Id: String(id), Name: `Movie ${id}`, Type: 'Movie', ProductionYear: 2020 };
}

const batch = (page, total) => ({
  items: Array.from({ length: Math.max(0, Math.min(36, total - (page - 1) * 36)) }, (_, i) => makeItem((page - 1) * 36 + i + 1)),
  totalItems: total,
  totalPages: Math.ceil(total / 36)
});

async function flush() {
  for (let i = 0; i < 4; i++) await Promise.resolve();
}

// A controllable stand-in for IntersectionObserver: `reach()` simulates the
// sentinel scrolling into view.
let observers;
class FakeObserver {
  constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
  observe() {}
  disconnect() { this.disconnected = true; }
  reach() { this.callback([{ isIntersecting: true }]); }
}

describe('LibraryPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    observers = [];
    globalThis.IntersectionObserver = FakeObserver;
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    window.location.hash = '#/movies';
  });

  afterEach(() => { delete globalThis.IntersectionObserver; });

  it('loads only the first batch and keeps the title visible while loading', async () => {
    let resolveLibrary;
    MediaApi.getLibrary.mockReturnValue(new Promise(resolve => { resolveLibrary = resolve; }));

    const container = LibraryPage({ type: 'Movie' });
    expect(container.querySelector('.page-heading-title').textContent).toBe('Alle Filme');
    expect(container.querySelector('.section-loader')).toBeTruthy();

    resolveLibrary(batch(1, 100));
    await flush();

    expect(MediaApi.getLibrary).toHaveBeenCalledTimes(1);
    expect(MediaApi.getLibrary).toHaveBeenCalledWith('Movie', null, null, 1, 36);
    expect(container.querySelectorAll('.media-card')).toHaveLength(36);
    expect(container.querySelector('.library-sentinel')).toBeTruthy();
    expect(container.querySelector('.library-end')).toBeNull();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('appends the next batch when the sentinel comes into view and stops at the end', async () => {
    MediaApi.getLibrary.mockImplementation((type, genre, studio, page) => Promise.resolve(batch(page, 80)));

    const container = LibraryPage({ type: 'Movie' });
    await flush();
    expect(observers).toHaveLength(1);

    observers[0].reach();
    expect(container.querySelector('.library-status .section-loader')).toBeTruthy();
    await flush();
    expect(container.querySelectorAll('.media-card')).toHaveLength(72);
    expect(MediaApi.getLibrary).toHaveBeenLastCalledWith('Movie', null, null, 2, 36);

    observers[0].reach();
    await flush();
    expect(container.querySelectorAll('.media-card')).toHaveLength(72 + 8);
    expect(container.querySelector('.library-end').textContent).toBe('80 Titel · Ende erreicht');
    expect(observers[0].disconnected).toBe(true);

    observers[0].reach();
    await flush();
    expect(MediaApi.getLibrary).toHaveBeenCalledTimes(3);
  });

  it('ignores a second trigger while a batch is still loading', async () => {
    MediaApi.getLibrary.mockResolvedValueOnce(batch(1, 200));
    LibraryPage({ type: 'Movie' });
    await flush();

    MediaApi.getLibrary.mockReturnValue(new Promise(() => {}));
    observers[0].reach();
    observers[0].reach();
    expect(MediaApi.getLibrary).toHaveBeenCalledTimes(2);
  });

  it('remembers how many batches were shown and reloads them when returning from a detail page', async () => {
    saveRouteState('#/movies', { pages: 3 });
    markReturnFromDetail({ scrollY: 640, itemId: '80' });
    MediaApi.getLibrary.mockImplementation((type, genre, studio, page) => Promise.resolve(batch(page, 200)));

    const container = LibraryPage({ type: 'Movie' });
    document.body.appendChild(container);
    await flush();

    expect(MediaApi.getLibrary).toHaveBeenCalledTimes(3);
    expect(container.querySelectorAll('.media-card')).toHaveLength(108);
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
    container.remove();
    expect(getRouteState('#/movies').pages).toBe(3);

    observers[0].reach();
    await flush();
    expect(MediaApi.getLibrary).toHaveBeenLastCalledWith('Movie', null, null, 4, 36);
    expect(getRouteState('#/movies').pages).toBe(4);
  });

  it('falls back to the saved scrollY when the clicked item is no longer present', async () => {
    saveRouteState('#/movies', { pages: 1 });
    markReturnFromDetail({ scrollY: 900, itemId: 'missing-id' });
    MediaApi.getLibrary.mockResolvedValue({ items: [makeItem('1')], totalItems: 1, totalPages: 1 });

    const container = LibraryPage({ type: 'Movie' });
    document.body.appendChild(container);
    await flush();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 900);
    container.remove();
  });

  it('shows the empty state for a category without items', async () => {
    MediaApi.getLibrary.mockResolvedValue({ items: [], totalItems: 0, totalPages: 0 });
    const container = LibraryPage({ type: 'Movie' });
    await flush();
    expect(container.textContent).toContain('Keine Inhalte gefunden');
    expect(container.querySelector('.library-sentinel')).toBeNull();
  });

  it('offers a retry when a later batch fails', async () => {
    MediaApi.getLibrary.mockResolvedValueOnce(batch(1, 100));
    const container = LibraryPage({ type: 'Movie' });
    await flush();

    MediaApi.getLibrary.mockRejectedValueOnce(new Error('boom'));
    observers[0].reach();
    await flush();
    expect(container.querySelector('.library-error')).toBeTruthy();
    expect(container.querySelectorAll('.media-card')).toHaveLength(36);

    MediaApi.getLibrary.mockResolvedValueOnce(batch(2, 100));
    container.querySelector('.library-error .btn-primary').click();
    await flush();
    expect(container.querySelectorAll('.media-card')).toHaveLength(72);
  });

  it('renders the publisher label as title and forwards publisherId to MediaApi for a known publisher group', async () => {
    window.location.hash = '#/publisher-group/warner-bros';
    MediaApi.getLibrary.mockResolvedValue({ items: [makeItem('1')], totalItems: 1, totalPages: 1 });

    const container = LibraryPage({ type: 'Movie,Series', publisherId: 'warner-bros' });
    await flush();

    expect(container.querySelector('.page-heading-title').textContent).toBe('Warner Bros');
    expect(MediaApi.getLibrary).toHaveBeenCalledWith('Movie,Series', null, null, 1, 36, { publisherId: 'warner-bros' });
  });

  it('does not crash for an unknown publisherId and still calls the API', async () => {
    window.location.hash = '#/publisher-group/unknown-publisher';
    MediaApi.getLibrary.mockResolvedValue({ items: [], totalItems: 0, totalPages: 0 });

    const container = LibraryPage({ type: 'Movie,Series', publisherId: 'unknown-publisher' });
    await flush();

    expect(container.querySelector('.page-heading-title')).toBeTruthy();
    expect(MediaApi.getLibrary).toHaveBeenCalledWith('Movie,Series', null, null, 1, 36, { publisherId: 'unknown-publisher' });
  });
});
