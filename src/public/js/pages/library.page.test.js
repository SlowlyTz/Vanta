import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../api/media.api.js';
import { saveRouteState, markReturnFromDetail } from '../utils/routeState.js';
import LibraryPage from './library.page.js';

vi.mock('../api/media.api.js', () => ({
  MediaApi: { getLibrary: vi.fn() }
}));

function makeItem(id) {
  return { Id: id, Name: `Movie ${id}`, Type: 'Movie', ProductionYear: 2020 };
}

describe('LibraryPage restore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    window.location.hash = '#/movies';
  });

  it('loads page 1 with the default limit when there is no return marker', async () => {
    MediaApi.getLibrary.mockResolvedValue({ items: [makeItem('1')], totalItems: 1, totalPages: 1 });

    LibraryPage({ type: 'Movie' });
    await Promise.resolve();
    await Promise.resolve();

    expect(MediaApi.getLibrary).toHaveBeenCalledWith('Movie', null, null, 1, 50);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('keeps the title visible while a local loader covers only the body, then clears it on success', async () => {
    let resolveLibrary;
    MediaApi.getLibrary.mockReturnValue(new Promise(resolve => { resolveLibrary = resolve; }));

    const container = LibraryPage({ type: 'Movie' });
    expect(container.querySelector('.library-title').textContent).toBe('Alle Filme');
    expect(container.querySelector('.section-loader')).toBeTruthy();

    resolveLibrary({ items: [makeItem('1')], totalItems: 1, totalPages: 1 });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelector('.library-title').textContent).toBe('Alle Filme');
    expect(container.querySelector('.section-loader')).toBeNull();
    expect(container.querySelectorAll('.media-card')).toHaveLength(1);
  });

  it('keeps existing cards and pagination on screen while paginating, showing only the local loader', async () => {
    MediaApi.getLibrary.mockResolvedValue({ items: [makeItem('1')], totalItems: 100, totalPages: 2 });

    const container = LibraryPage({ type: 'Movie' });
    await Promise.resolve();
    await Promise.resolve();

    let resolveNext;
    MediaApi.getLibrary.mockReturnValue(new Promise(resolve => { resolveNext = resolve; }));
    const nextBtn = Array.from(container.querySelectorAll('.pagination-btn')).find(b => b.textContent === 'Vor');
    nextBtn.click();

    expect(container.querySelector('.section-loader')).toBeTruthy();

    resolveNext({ items: [makeItem('2')], totalItems: 100, totalPages: 2 });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(container.querySelector('.section-loader')).toBeNull();
    expect(container.querySelectorAll('.media-card')).toHaveLength(1);
  });

  it('restores the saved page and limit when returning from a detail page', async () => {
    window.location.hash = '#/movies';
    saveRouteState('#/movies', { page: 3, limit: 20 });
    markReturnFromDetail({ scrollY: 640, itemId: '42' });

    MediaApi.getLibrary.mockResolvedValue({
      items: [makeItem('42')],
      totalItems: 60,
      totalPages: 3
    });

    LibraryPage({ type: 'Movie' });
    await Promise.resolve();
    await Promise.resolve();

    expect(MediaApi.getLibrary).toHaveBeenCalledWith('Movie', null, null, 3, 20);
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });

  it('falls back to the saved scrollY when the clicked item is no longer present', async () => {
    window.location.hash = '#/movies';
    saveRouteState('#/movies', { page: 1, limit: 50 });
    markReturnFromDetail({ scrollY: 900, itemId: 'missing-id' });

    MediaApi.getLibrary.mockResolvedValue({
      items: [makeItem('1')],
      totalItems: 1,
      totalPages: 1
    });

    LibraryPage({ type: 'Movie' });
    await Promise.resolve();
    await Promise.resolve();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 900);
  });

  it('scrolls to top again on normal pagination after a restore', async () => {
    saveRouteState('#/movies', { page: 2, limit: 50 });
    markReturnFromDetail({ scrollY: 500, itemId: '1' });
    MediaApi.getLibrary.mockResolvedValue({ items: [makeItem('1')], totalItems: 100, totalPages: 2 });

    const container = LibraryPage({ type: 'Movie' });
    await Promise.resolve();
    await Promise.resolve();
    window.scrollTo.mockClear();

    const prevBtn = Array.from(container.querySelectorAll('.pagination-btn')).find(b => b.textContent === 'Zurück');
    MediaApi.getLibrary.mockResolvedValue({ items: [makeItem('1')], totalItems: 100, totalPages: 2 });
    prevBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
