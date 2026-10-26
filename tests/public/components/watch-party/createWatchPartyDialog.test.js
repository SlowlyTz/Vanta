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
    recent: vi.fn(),
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
    WatchPartyApi.recent.mockResolvedValue({ parties: [] });
    window.location.hash = '';
  });

  it('öffnet auf „Weiterschauen“ für jede lebende Party und sperrt volle', async () => {
    WatchPartyApi.suggestions.mockResolvedValue({ items: [] });
    WatchPartyApi.recent.mockResolvedValue({ parties: [
      { id: 'p1', itemSnapshot: { type: 'Episode', seriesName: 'Dark', seasonNumber: 1, episodeNumber: 3, backdrop: { id: 's1', tag: 'b' } }, ownerName: 'Lena', status: 'playing', memberCount: 3, maxMembers: 4, full: false },
      { id: 'p2', itemSnapshot: { type: 'Movie', name: 'Dune' }, ownerName: 'Tom', status: 'lobby', memberCount: 4, maxMembers: 4, full: true }
    ] });

    const dialog = createWatchPartyDialog();
    await dialog.open();
    await flush();

    expect(dialog.element.querySelector('.watch-party-choice-heading').textContent).toBe('Weiterschauen');
    const items = [...dialog.element.querySelectorAll('.watch-party-recent-item')];
    expect(items[0].textContent).toContain('Dark · S01E03');
    expect(items[0].textContent).toContain('von Lena · Läuft · 3/4 Plätze');
    expect(items[0].querySelector('button').textContent).toBe('Weiterschauen');
    expect(items[1].querySelector('button').disabled).toBe(true);
    expect(items[1].querySelector('button').textContent).toBe('Voll');
    expect(dialog.element.querySelector('.watch-party-choice-button').textContent).toContain('Neue Watch Party starten');
    expect(WatchPartyApi.suggestions).not.toHaveBeenCalled();

    items[0].querySelector('button').click();
    expect(window.location.hash).toBe('#/watch-party/p1');
    expect(dialog.isOpen()).toBe(false);
  });

  it('„Neue Watch Party starten“ führt zur Auswahl, Zurück wieder zu „Weiterschauen“', async () => {
    WatchPartyApi.suggestions.mockResolvedValue({ items: [movieCard()] });
    WatchPartyApi.recent.mockResolvedValue({ parties: [{ id: 'p1', itemSnapshot: { name: 'Dune' }, status: 'lobby', memberCount: 1, maxMembers: 4, full: false }] });

    const dialog = createWatchPartyDialog();
    await dialog.open();
    await flush();
    dialog.element.querySelector('.watch-party-choice-button').click();
    await flush();
    expect(WatchPartyApi.suggestions).toHaveBeenCalled();
    expect(dialog.element.querySelector('.watch-party-recent-item')).toBeNull();

    const back = dialog.element.querySelector('.watch-party-dialog-header button');
    expect(back.hidden).toBe(false);
    back.click();
    expect(dialog.element.querySelector('.watch-party-recent-item')).not.toBeNull();
  });

  it('ohne lebende Party geht es gleich zur Auswahl, mit Titel gleich zur Party', async () => {
    WatchPartyApi.suggestions.mockResolvedValue({ items: [] });
    WatchPartyApi.create.mockResolvedValue({ party: { id: 'new-1' } });
    const dialog = createWatchPartyDialog();
    await dialog.openWith(movieCard({ Id: 'movie-9' }));
    await flush();
    expect(dialog.element.querySelector('.watch-party-choice-heading')).toBeNull();
    expect(WatchPartyApi.create).toHaveBeenCalledWith('movie-9');
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

  it('asks before creating a party for a title picked in the dialog', async () => {
    WatchPartyApi.suggestions.mockResolvedValue({ items: [movieCard({ Id: 'movie-2' })] });
    WatchPartyApi.create.mockResolvedValue({ party: { id: 'party-2' } });
    const dialog = createWatchPartyDialog();
    await dialog.open();
    await flush();

    dialog.element.querySelector('.watch-party-card').click();
    await flush();
    expect(WatchPartyApi.create).not.toHaveBeenCalled();

    // Zurück brings the same list back.
    [...dialog.element.querySelectorAll('.watch-party-confirm button')].find(button => button.textContent === 'Zurück').click();
    expect(dialog.element.querySelectorAll('.watch-party-card').length).toBe(1);

    dialog.element.querySelector('.watch-party-card').click();
    dialog.element.querySelector('.watch-party-confirm .ui-button-primary').click();
    await flush();
    expect(WatchPartyApi.create).toHaveBeenCalledWith('movie-2');
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
    dialog.element.querySelector('.watch-party-confirm .ui-button-primary').click();
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

});
