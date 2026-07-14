import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../../../../src/public/js/api/media.api.js';
import { WatchPartyApi } from '../../../../src/public/js/api/watch-party.api.js';
import { createWatchPartyDialog } from '../../../../src/public/js/components/watch-party/createWatchPartyDialog.js';

vi.mock('../../../../src/public/js/api/media.api.js', () => ({
  MediaApi: {
    search: vi.fn(),
    getSeasons: vi.fn(),
    getEpisodes: vi.fn(),
    getImageUrl: vi.fn().mockReturnValue('poster.jpg')
  }
}));

vi.mock('../../../../src/public/js/api/watch-party.api.js', () => ({
  WatchPartyApi: {
    create: vi.fn(),
    resume: vi.fn(),
    resumable: vi.fn(),
    suggestions: vi.fn()
  }
}));

vi.mock('../../../../src/public/js/store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function movieCard(overrides = {}) {
  return { Id: 'movie-1', Name: 'Test Movie', Type: 'Movie', ProductionYear: 2024, ImageTags: { Primary: 'tag' }, ...overrides };
}

function seriesCard(overrides = {}) {
  return { Id: 'series-1', Name: 'Test Series', Type: 'Series', ImageTags: {}, ...overrides };
}

describe('createWatchPartyDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    WatchPartyApi.resumable.mockResolvedValue({ party: null });
    window.location.hash = '';
  });

  it('lädt Vorschläge, wenn der Dialog ohne Suche geöffnet wird', async () => {
    WatchPartyApi.suggestions.mockResolvedValue({ items: [movieCard()] });

    const dialog = createWatchPartyDialog();
    await dialog.open();
    await flush();

    expect(WatchPartyApi.suggestions).toHaveBeenCalled();
    expect(dialog.element.querySelectorAll('.watch-party-card').length).toBe(1);
  });

  it('rendert Suchergebnisse als Cards mit Poster, Typ-Badge und Jahr', async () => {
    WatchPartyApi.suggestions.mockResolvedValue({ items: [] });
    MediaApi.search.mockResolvedValue([movieCard({ Name: 'Dune', ProductionYear: 2021 })]);

    const dialog = createWatchPartyDialog();
    await dialog.open();
    await flush();

    const searchInput = dialog.element.querySelector('.watch-party-search-input');
    searchInput.value = 'dune';
    searchInput.dispatchEvent(new Event('input'));

    await new Promise(resolve => setTimeout(resolve, 350));
    await flush();

    const card = dialog.element.querySelector('.watch-party-card');
    expect(card).toBeTruthy();
    expect(dialog.element.querySelector('.watch-party-card-poster img').getAttribute('src')).toBe('poster.jpg');
    expect(dialog.element.querySelector('.watch-party-card-badge').textContent).toBe('Film');
    expect(dialog.element.querySelector('.watch-party-card-meta').textContent).toBe('2021');
  });

  it('öffnet den Episode-Picker bei Serienauswahl und erstellt die Party mit der Episode-ID', async () => {
    WatchPartyApi.suggestions.mockResolvedValue({ items: [seriesCard()] });
    MediaApi.getSeasons.mockResolvedValue([{ Id: 'season-1', Name: 'Staffel 1' }]);
    MediaApi.getEpisodes.mockResolvedValue([
      { Id: 'ep-1', Name: 'Pilot', ParentIndexNumber: 1, IndexNumber: 1 }
    ]);
    WatchPartyApi.create.mockResolvedValue({ party: { id: 'party-1' } });

    const dialog = createWatchPartyDialog();
    await dialog.open();
    await flush();

    dialog.element.querySelector('.watch-party-card').click();
    await flush();

    expect(dialog.element.querySelector('.watch-party-episode-button')).toBeTruthy();

    dialog.element.querySelector('.watch-party-episode-button').click();
    await flush();

    expect(WatchPartyApi.create).toHaveBeenCalledWith('ep-1');
    expect(window.location.hash).toBe('#/watch-party/party-1');
  });

  it('zeigt nach leerem Suchfeld wieder die Vorschläge', async () => {
    WatchPartyApi.suggestions.mockResolvedValue({ items: [movieCard()] });
    MediaApi.search.mockResolvedValue([seriesCard()]);

    const dialog = createWatchPartyDialog();
    await dialog.open();
    await flush();

    const searchInput = dialog.element.querySelector('.watch-party-search-input');
    searchInput.value = 'x';
    searchInput.dispatchEvent(new Event('input'));
    await new Promise(resolve => setTimeout(resolve, 350));
    await flush();
    expect(WatchPartyApi.suggestions).toHaveBeenCalledTimes(1);

    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    await new Promise(resolve => setTimeout(resolve, 350));
    await flush();

    expect(WatchPartyApi.suggestions).toHaveBeenCalledTimes(2);
  });

  it('fragt beim Öffnen nach Neue Party vs Fortsetzen, wenn eine fortsetzbare Party existiert', async () => {
    WatchPartyApi.resumable.mockResolvedValue({
      party: { originalPartyId: 'party-1', itemSnapshot: { name: 'Alte Party' } }
    });

    const dialog = createWatchPartyDialog();
    await dialog.open();
    await flush();

    const choices = dialog.element.querySelectorAll('.watch-party-choice-button');
    expect(choices).toHaveLength(2);
    expect(choices[0].textContent).toContain('Neue Party starten');
    expect(choices[1].textContent).toContain('Letzte Party fortsetzen');
  });
});
