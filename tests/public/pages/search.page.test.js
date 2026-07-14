import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../../../src/public/js/api/media.api.js';
import SearchPage from '../../../src/public/js/pages/search.page.js';

vi.mock('../../../src/public/js/api/media.api.js', () => ({
  MediaApi: { search: vi.fn() }
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
    MediaApi.search.mockReturnValue(new Promise(resolve => { resolveSearch = resolve; }));

    const container = SearchPage();
    const input = container.querySelector('.search-input-field');

    vi.useFakeTimers();
    input.value = 'matrix';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(450);
    vi.useRealTimers();

    expect(container.querySelector('.section-loader')).toBeTruthy();
    expect(input.disabled).toBe(false);

    resolveSearch([makeItem('1')]);
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
    expect(container.querySelector('.search-empty-state p').textContent).toBe('Tippe den Namen eines Films oder einer Serie in das Suchfeld ein.');
  });

  it('ignores a stale response that resolves after a newer search has started', async () => {
    const container = SearchPage();

    let resolveFirst;
    MediaApi.search.mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }));
    const firstSearch = container.querySelector('.search-input-field');

    vi.useFakeTimers();
    firstSearch.value = 'first';
    firstSearch.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(450);

    let resolveSecond;
    MediaApi.search.mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve; }));
    firstSearch.value = 'second';
    firstSearch.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(450);
    vi.useRealTimers();

    resolveSecond([makeItem('2')]);
    await flush();
    resolveFirst([makeItem('1')]);
    await flush();

    expect(container.querySelectorAll('.media-card')).toHaveLength(1);
    expect(container.querySelector('.media-card').dataset.itemId).toBe('2');
  });
});
