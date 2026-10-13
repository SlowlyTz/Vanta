import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/public/js/api/media.api.js', () => ({
  MediaApi: {
    getItem: vi.fn(),
    getNextUp: vi.fn(),
    removeFromResume: vi.fn(),
    restoreResume: vi.fn(),
    markPlayed: vi.fn(),
    markUnplayed: vi.fn()
  }
}));
vi.mock('../../../src/public/js/api/watchlist.api.js', () => ({
  WatchlistApi: { add: vi.fn(async () => ({})), remove: vi.fn(async () => ({})), ids: vi.fn(), list: vi.fn() }
}));
vi.mock('../../../src/public/js/store/app.store.js', () => ({ appStore: { showToast: vi.fn() } }));
vi.mock('../../../src/public/js/utils/clipboard.js', () => ({ copyText: vi.fn(async () => {}) }));

import { MediaApi } from '../../../src/public/js/api/media.api.js';
import { appStore } from '../../../src/public/js/store/app.store.js';
import { copyText } from '../../../src/public/js/utils/clipboard.js';
import { watchlistStore } from '../../../src/public/js/store/watchlist.store.js';
import { closeAllModals } from '../../../src/public/js/utils/modal.js';
import { buildMenuEntries, openMediaActions, shareText, OPEN_WATCH_PARTY_EVENT } from '../../../src/public/js/components/mediaActions.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const labels = () => [...document.querySelectorAll('.media-actions-item')].map(button => ({
  id: button.dataset.action, label: button.querySelector('.media-actions-label').textContent, disabled: button.disabled
}));
const click = id => document.querySelector(`.media-actions-item[data-action="${id}"]`).click();

const cardHtml = ({ id = 'm1', type = 'Movie', title = 'Dune', resume = false } = {}) => `
  <div ${resume ? 'data-resume-row="true"' : ''}><div class="media-carousel-item">
    <a class="media-card" href="#/item/${id}" data-item-id="${id}" data-item-type="${type}">
      <img src="/p.jpg" alt="${title}"><div class="media-card-title">${title}</div>
    </a>
  </div></div>`;

describe('shareText', () => {
  it('links the detail page, the series for an episode', () => {
    expect(shareText({ Id: 'm1', Type: 'Movie', Name: 'Dune' }, 'https://app.test')).toBe('Schau „Dune“ auf VANTA: https://app.test/#/item/m1');
    expect(shareText({ Id: 'e1', Type: 'Episode', Name: 'Pilot', SeriesId: 's1', SeriesName: 'Dark' }, 'https://app.test'))
      .toBe('Schau „Dark“ auf VANTA: https://app.test/#/item/s1');
  });
});

describe('buildMenuEntries', () => {
  beforeEach(() => watchlistStore.clear());

  it('offers "Abspielen" for a title not started yet', () => {
    const entries = buildMenuEntries({ item: { Id: 'm1', Type: 'Movie', UserData: {} }, cardInfo: { id: 'm1', type: 'Movie' } });
    expect(entries.find(e => e.id === 'resume')).toMatchObject({ label: 'Abspielen', disabled: false, targetId: 'm1', hint: null });
    expect(entries.map(e => e.id)).toEqual(['resume', 'watchlist', 'share', 'details', 'played', 'party']);
  });

  it('continues a started film and a series at its next episode', () => {
    const movie = buildMenuEntries({ item: { Id: 'm1', Type: 'Movie', RunTimeTicks: 72_000_000_000, UserData: { PlaybackPositionTicks: 36_000_000_000 } }, cardInfo: { id: 'm1' } });
    expect(movie[0]).toMatchObject({ disabled: false, targetId: 'm1', hint: 'noch 60 Min.' });

    const series = buildMenuEntries({ item: { Id: 's1', Type: 'Series', UserData: { PlayedPercentage: 30 } }, cardInfo: { id: 's1' }, nextUp: { Id: 'e4', ParentIndexNumber: 2, IndexNumber: 4 } });
    expect(series[0]).toMatchObject({ label: 'Weiterschauen', disabled: false, targetId: 'e4', hint: 'S2 E4' });
    // A whole series can be marked (un)watched too.
    expect(series.find(e => e.id === 'played').label).toBe('Als gesehen markieren');
  });

  it('does not count Jellyfin\'s first episode of an unstarted series as started', () => {
    const series = buildMenuEntries({
      item: { Id: 's1', Type: 'Series', RecursiveItemCount: 8, UserData: { PlayedPercentage: 0, UnplayedItemCount: 8 } },
      cardInfo: { id: 's1' },
      nextUp: { Id: 'e1', UserData: {} }
    });
    expect(series[0]).toMatchObject({ label: 'Abspielen', disabled: false, targetId: 's1' });
  });

  it('offers "Aus Weiter schauen entfernen" only in that row', () => {
    const entries = buildMenuEntries({ item: { Id: 'e1', Type: 'Episode', SeriesId: 's1', UserData: {} }, cardInfo: { id: 'e1', inResumeRow: true } });
    expect(entries.map(e => e.id)).toContain('hide');
    expect(entries[0].disabled).toBe(false);
    expect(entries.find(e => e.id === 'watchlist').listId).toBe('s1');
  });
});

describe('openMediaActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watchlistStore.clear();
    window.matchMedia = vi.fn(() => ({ matches: false }));
  });

  afterEach(() => {
    closeAllModals();
    document.body.innerHTML = '';
  });

  it('opens at once and fills in the states when the title arrived', async () => {
    document.body.innerHTML = cardHtml();
    let resolve;
    const loadItem = () => new Promise(r => { resolve = r; });
    openMediaActions(document.querySelector('.media-card'), { x: 5, y: 5, source: 'mouse' }, { loadItem });

    expect(document.querySelector('.media-actions-title').textContent).toBe('Dune');
    expect(document.querySelector('.media-actions').classList.contains('is-popover')).toBe(true);
    expect(labels().find(e => e.id === 'resume').disabled).toBe(true);

    resolve({ Id: 'm1', Type: 'Movie', Name: 'Dune', UserData: { PlaybackPositionTicks: 10, Played: false } });
    await flush();
    expect(labels().find(e => e.id === 'resume').disabled).toBe(false);
    expect(labels().find(e => e.id === 'played').label).toBe('Als gesehen markieren');
  });

  it('adds to "Meine Liste" and the entry flips', async () => {
    document.body.innerHTML = cardHtml();
    openMediaActions(document.querySelector('.media-card'), {}, { loadItem: async () => ({ Id: 'm1', Type: 'Movie', Name: 'Dune', UserData: {} }) });
    await flush();
    click('watchlist');
    await flush();
    expect(watchlistStore.has('m1')).toBe(true);
    expect(appStore.showToast).toHaveBeenCalledWith('Zu meiner Liste hinzugefügt', 'success');
  });

  it('copies the share text', async () => {
    document.body.innerHTML = cardHtml();
    openMediaActions(document.querySelector('.media-card'), {}, { loadItem: async () => ({ Id: 'm1', Type: 'Movie', Name: 'Dune' }) });
    await flush();
    click('share');
    await flush();
    expect(copyText).toHaveBeenCalledWith(`Schau „Dune“ auf VANTA: ${window.location.origin}/#/item/m1`);
    expect(appStore.showToast).toHaveBeenCalledWith('Link kopiert', 'success');
  });

  it('takes a card out of "Weiter schauen" with undo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      document.body.innerHTML = cardHtml({ id: 'e1', type: 'Episode', resume: true });
      MediaApi.removeFromResume.mockResolvedValue({ undo: { kind: 'series', seriesId: 's1' } });
      MediaApi.restoreResume.mockResolvedValue({ restored: true });
      openMediaActions(document.querySelector('.media-card'), {}, { loadItem: async () => ({ Id: 'e1', Type: 'Episode', SeriesId: 's1', Name: 'Pilot', UserData: {} }) });
      await vi.advanceTimersByTimeAsync(0);
      click('hide');
      await vi.advanceTimersByTimeAsync(300);

      expect(document.querySelector('.media-card')).toBeNull();
      const [message, type, options] = appStore.showToast.mock.calls.at(-1);
      expect([message, type]).toEqual(['Aus „Weiter schauen“ entfernt', 'success']);

      await options.action.onClick();
      expect(MediaApi.restoreResume).toHaveBeenCalledWith({ kind: 'series', seriesId: 's1' });
      expect(document.querySelector('.media-card')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('asks the navbar to open the watch party dialog with the title', async () => {
    document.body.innerHTML = cardHtml();
    const listener = vi.fn();
    window.addEventListener(OPEN_WATCH_PARTY_EVENT, listener);
    openMediaActions(document.querySelector('.media-card'), {}, { loadItem: async () => ({ Id: 'm1', Type: 'Movie', Name: 'Dune' }) });
    await flush();
    click('party');
    expect(listener.mock.calls[0][0].detail.item.Id).toBe('m1');
    window.removeEventListener(OPEN_WATCH_PARTY_EVENT, listener);
  });

  it('shows a series\' next episode for "Weiterschauen"', async () => {
    document.body.innerHTML = cardHtml({ id: 's1', type: 'Series', title: 'Dark' });
    MediaApi.getNextUp.mockResolvedValue({ episode: { Id: 'e7', ParentIndexNumber: 1, IndexNumber: 7, UserData: { LastPlayedDate: '2026-10-01T00:00:00Z' } } });
    openMediaActions(document.querySelector('.media-card'), {}, { loadItem: async () => ({ Id: 's1', Type: 'Series', Name: 'Dark', UserData: {} }) });
    await flush();
    await flush();
    const resume = document.querySelector('[data-action="resume"]');
    expect(resume.disabled).toBe(false);
    expect(resume.textContent).toContain('S1 E7');
    resume.click();
    expect(window.location.hash).toBe('#/player/e7');
  });
});
