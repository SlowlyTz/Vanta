import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../../../src/public/js/api/media.api.js';
import SearchPage, { readSearchState, searchStateToHash } from '../../../src/public/js/pages/search.page.js';
import { recentSearches } from '../../../src/public/js/utils/recentSearches.js';

vi.mock('../../../src/public/js/api/media.api.js', () => ({
  MediaApi: { search: vi.fn(), searchFull: vi.fn(), getGenres: vi.fn(async () => [{ Name: 'Drama' }, { Name: 'Krimi' }]) }
}));

function makeItem(id) {
  return { Id: id, Name: `Movie ${id}`, Type: 'Movie', ProductionYear: 2020 };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '#/search';
  });

  it('shows a local loader in the results area while keeping the search field enabled', async () => {
    let resolveSearch;
    MediaApi.searchFull.mockReturnValue(new Promise(resolve => { resolveSearch = resolve; }));

    const container = SearchPage();
    const input = container.querySelector('.search-input-field');

    vi.useFakeTimers();
    input.value = 'matrix';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(450);
    vi.useRealTimers();

    expect(container.querySelector('.section-loader')).toBeTruthy();
    expect(input.disabled).toBe(false);

    resolveSearch({ items: [makeItem('1')], people: [] });
    await flush();

    expect(container.querySelector('.section-loader')).toBeNull();
    expect(container.querySelectorAll('.media-card')).toHaveLength(1);
  });

  it('rendert das Suchfeld direkt auf der Search-Page statt als mobile-only Element', () => {
    const container = SearchPage();

    const wrapper = container.querySelector('.search-input-wrapper');
    expect(wrapper).toBeTruthy();
    expect(wrapper.classList.contains('mobile-search-input-wrapper')).toBe(false);
    expect(container.querySelector('.search-input-field')).toBeTruthy();
    expect(container.querySelector('.search-empty-state p').textContent).toBe('Tippe den Namen eines Films, einer Serie oder einer Person in das Suchfeld ein.');
  });

  it('markiert das Suchfeld für den Autofokus des Routers', () => {
    const container = SearchPage();
    const input = container.querySelector('.search-input-field');

    expect(input.hasAttribute('data-autofocus')).toBe(true);
  });

  it('markiert das Suchfeld nicht, wenn die Route bereits eine Suche mitbringt', () => {
    window.location.hash = '#/search?q=matrix';
    MediaApi.searchFull.mockResolvedValue({ items: [], people: [] });

    const container = SearchPage();
    const input = container.querySelector('.search-input-field');

    expect(input.value).toBe('matrix');
    expect(input.hasAttribute('data-autofocus')).toBe(false);
  });

  it('ignores a stale response that resolves after a newer search has started', async () => {
    const container = SearchPage();

    let resolveFirst;
    MediaApi.searchFull.mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }));
    const firstSearch = container.querySelector('.search-input-field');

    vi.useFakeTimers();
    firstSearch.value = 'first';
    firstSearch.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(450);

    let resolveSecond;
    MediaApi.searchFull.mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve; }));
    firstSearch.value = 'second';
    firstSearch.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(450);
    vi.useRealTimers();

    resolveSecond({ items: [makeItem('2')], people: [] });
    await flush();
    resolveFirst({ items: [makeItem('1')], people: [] });
    await flush();

    expect(container.querySelectorAll('.media-card')).toHaveLength(1);
    expect(container.querySelector('.media-card').dataset.itemId).toBe('2');
  });

  it('labels the search field and announces how the search went', async () => {
    MediaApi.searchFull.mockResolvedValue({ items: [makeItem('1'), makeItem('2')], people: [] });
    window.location.hash = '#/search?q=matrix';

    const container = SearchPage();
    await flush();

    const input = container.querySelector('.search-input-field');
    expect(input.type).toBe('search');
    expect(input.getAttribute('aria-label')).toBe('Filme, Serien oder Personen suchen');
    expect(container.querySelector('[role="search"]').contains(input)).toBe(true);
    expect(container.querySelector('[role="status"]').textContent).toBe('2 Treffer für „matrix“');
  });
});

describe('SearchPage filters, people and recent searches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.location.hash = '#/search';
  });

  it('reads and writes the search state in the hash', () => {
    const state = readSearchState('#/search?q=heat&type=Movie&genre=Drama,Krimi&decade=1990&fsk=16&unwatched=1');
    expect(state).toEqual({ q: 'heat', type: 'Movie', genre: ['Drama', 'Krimi'], decade: '1990', fsk: '16', unwatched: true });
    expect(searchStateToHash(state)).toBe('#/search?q=heat&type=Movie&genre=Drama%2CKrimi&decade=1990&fsk=16&unwatched=1');
    expect(searchStateToHash(readSearchState('#/search'))).toBe('#/search');
  });

  it('searches with a filter alone and keeps it in the hash', async () => {
    MediaApi.searchFull.mockResolvedValue({ items: [makeItem('1')], people: [] });
    const container = SearchPage();
    await flush();

    container.querySelector('.search-filter-toggle').click();
    const series = [...container.querySelectorAll('.search-filter-chip')].find(chip => chip.textContent === 'Serien');
    series.click();
    await flush();

    expect(MediaApi.searchFull).toHaveBeenLastCalledWith('', expect.objectContaining({ type: 'Series' }), expect.anything());
    expect(window.location.hash).toBe('#/search?type=Series');
    expect(container.querySelector('.search-filter-count').textContent).toBe('1');
  });

  it('shows matching people above the titles', async () => {
    window.location.hash = '#/search?q=pacino';
    MediaApi.searchFull.mockResolvedValue({ items: [makeItem('1')], people: [{ Id: 'p1', Name: 'Al Pacino' }] });
    const container = SearchPage();
    await flush();

    expect(container.querySelector('.search-people .carousel-title-text, .search-people h2, .search-people h3')?.textContent).toBe('Personen');
    expect(container.querySelector('.search-people .cast-name').textContent).toBe('Al Pacino');
  });

  it('offers recent searches while the field is empty, removable one by one', async () => {
    recentSearches.add('dark');
    recentSearches.add('heat');
    const container = SearchPage();
    await flush();

    const chips = () => [...container.querySelectorAll('.search-recent-text')].map(chip => chip.textContent);
    expect(chips()).toEqual(['heat', 'dark']);

    container.querySelector('.search-recent-remove').click();
    expect(chips()).toEqual(['dark']);

    MediaApi.searchFull.mockResolvedValue({ items: [], people: [] });
    container.querySelector('.search-recent-text').click();
    await flush();
    expect(container.querySelector('.search-input-field').value).toBe('dark');
    expect(container.querySelector('.search-recent').hidden).toBe(true);

    container.querySelector('.search-input-field').value = '';
    container.querySelector('.search-input-field').dispatchEvent(new Event('input'));
  });

  it('remembers a search on Enter', () => {
    const container = SearchPage();
    const input = container.querySelector('.search-input-field');
    input.value = 'matrix';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(recentSearches.list()).toEqual(['matrix']);
  });
});
