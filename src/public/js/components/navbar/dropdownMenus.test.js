import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../../api/media.api.js';
import { loadDropdowns } from './dropdownMenus.js';

vi.mock('../../api/media.api.js', () => ({
  MediaApi: {
    getGenres: vi.fn(),
    getStudios: vi.fn()
  }
}));

function buildNavbarStub() {
  const el = document.createElement('div');
  el.innerHTML = `
    <ul id="movies-dropdown-menu"></ul>
    <ul id="series-dropdown-menu"></ul>
    <ul id="publishers-dropdown-menu"></ul>
  `;
  return el;
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('loadDropdowns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a local loading hint in the menu without blocking other dropdowns, then renders results', async () => {
    let resolveMovieGenres;
    MediaApi.getGenres.mockImplementation((type) => {
      if (type === 'Movie') return new Promise(resolve => { resolveMovieGenres = resolve; });
      return Promise.resolve([{ Name: 'Comedy' }]);
    });
    MediaApi.getStudios.mockResolvedValue([]);

    const navbarEl = buildNavbarStub();
    loadDropdowns(navbarEl);

    const movieMenu = navbarEl.querySelector('#movies-dropdown-menu');
    const seriesMenu = navbarEl.querySelector('#series-dropdown-menu');

    expect(movieMenu.getAttribute('aria-busy')).toBe('true');
    expect(movieMenu.textContent).toContain('Lädt');

    await flush();

    expect(seriesMenu.hasAttribute('aria-busy')).toBe(false);
    expect(seriesMenu.textContent).toContain('Comedy');
    expect(movieMenu.getAttribute('aria-busy')).toBe('true');

    resolveMovieGenres([{ Name: 'Action' }]);
    await flush();

    expect(movieMenu.hasAttribute('aria-busy')).toBe(false);
    expect(movieMenu.textContent).toContain('Action');
  });
});
