import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/public/js/api/media.api.js', () => ({
  MediaApi: { getUserData: vi.fn(), refreshUserData: vi.fn(async () => ({})) }
}));

import { MediaApi } from '../../../src/public/js/api/media.api.js';
import { applyCardUserData, observeCardUserData, forgetCardUserData, updateCardUserData, summaryFromUserData, __test } from '../../../src/public/js/utils/cardUserData.js';
import { PLAYED_CHANGED_EVENT } from '../../../src/public/js/components/playedToggle.js';
import { createPageScope, setActivePageScope } from '../../../src/public/js/utils/pageScope.js';

const card = ({ id = 'm1', type = 'Movie', subtitle = '2020' } = {}) => {
  const element = document.createElement('a');
  element.className = 'media-card';
  element.dataset.itemId = id;
  element.dataset.itemType = type;
  element.innerHTML = `<div class="media-card-image-container"><img></div><div class="media-card-details"><div class="media-card-subtitle">${subtitle}</div></div>`;
  document.body.appendChild(element);
  return element;
};

describe('applyCardUserData', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('draws the progress of a film and removes it once watched', () => {
    const element = card();
    applyCardUserData(element, { played: false, progress: 0.25 });
    expect(element.querySelector('.media-progress-fill').style.width).toBe('25%');

    applyCardUserData(element, { played: true, progress: null });
    expect(element.querySelector('.media-progress-bar')).toBeNull();
    expect(element.classList.contains('is-played')).toBe(true);
    expect(element.querySelector('.media-card-played')).toBeTruthy();
  });

  it('shows the next episode of a started series and its share watched', () => {
    const element = card({ id: 's1', type: 'Series', subtitle: '2 Staffeln' });
    applyCardUserData(element, { played: false, next: 'S2 E4', seriesProgress: 0.4 });
    expect(element.querySelector('.media-card-subtitle').textContent).toBe('S2 E4 als Nächstes');
    expect(element.querySelector('.media-progress-bar').classList.contains('is-series')).toBe(true);

    applyCardUserData(element, { played: false, next: null, seriesProgress: null });
    expect(element.querySelector('.media-card-subtitle').textContent).toBe('2 Staffeln');
  });
});

describe('observeCardUserData', () => {
  let observed;
  let callback;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    forgetCardUserData({ server: false });
    observed = [];
    window.IntersectionObserver = class {
      constructor(cb) { callback = cb; }
      observe(target) { observed.push(target); }
      unobserve(target) { observed = observed.filter(t => t !== target); }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('asks once, bundled, for the cards that came into view', async () => {
    const a = card({ id: 'a' });
    const b = card({ id: 'b' });
    observeCardUserData(a);
    observeCardUserData(b);
    MediaApi.getUserData.mockResolvedValue({ a: { played: false, progress: 0.5 }, b: { played: true } });

    callback([{ isIntersecting: true, target: a }, { isIntersecting: true, target: b }]);
    await vi.advanceTimersByTimeAsync(100);

    expect(MediaApi.getUserData).toHaveBeenCalledTimes(1);
    expect(MediaApi.getUserData).toHaveBeenCalledWith(['a', 'b']);
    expect(a.querySelector('.media-progress-fill').style.width).toBe('50%');
    expect(b.classList.contains('is-played')).toBe(true);

    // A new card of a known title is drawn from the minute cache.
    const again = card({ id: 'a' });
    observeCardUserData(again);
    expect(again.querySelector('.media-progress-fill').style.width).toBe('50%');
    expect(MediaApi.getUserData).toHaveBeenCalledTimes(1);
  });

  it('starts over after the player was left', async () => {
    __test.cache.set('a', { at: Date.now(), summary: { played: true } });
    window.location.hash = '#/player/a';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.location.hash = '#/home';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(__test.cache.size).toBe(0);
    expect(MediaApi.refreshUserData).toHaveBeenCalled();
  });
});

describe('cardUserData per page and from elsewhere', () => {
  let observed;

  beforeEach(() => {
    vi.clearAllMocks();
    forgetCardUserData({ server: false });
    observed = [];
    __test.resetObserver();
    window.IntersectionObserver = class {
      observe(target) { observed.push(target); }
      unobserve(target) { observed = observed.filter(t => t !== target); }
    };
  });

  afterEach(() => {
    setActivePageScope(null);
    document.body.innerHTML = '';
  });

  it('stops watching the cards of a page that was left', () => {
    const scope = createPageScope();
    setActivePageScope(scope);
    const a = card({ id: 'leave-a' });
    observeCardUserData(a);
    expect(observed).toContain(a);
    scope.leave();
    expect(observed).not.toContain(a);
  });

  it('fills the cache from an item that brings its own UserData', () => {
    const item = { Id: 'r1', Type: 'Movie', RunTimeTicks: 100, UserData: { Played: false, PlaybackPositionTicks: 25 } };
    expect(summaryFromUserData(item)).toEqual({ played: false, progress: 0.25, next: null, seriesProgress: null });
    expect(summaryFromUserData({ Id: 's', Type: 'Series', UserData: { Played: false } })).toBeNull();
    observeCardUserData(card({ id: 'r1' }), item);
    expect(__test.cache.get('r1').summary.progress).toBe(0.25);
    expect(observed).toHaveLength(0);
    expect(MediaApi.getUserData).not.toHaveBeenCalled();
  });

  it('marks every card of a title watched and back, also through the played event', () => {
    const one = card({ id: 'p1' });
    const two = card({ id: 'p1' });
    applyCardUserData(one, { played: false, progress: 0.4 });
    applyCardUserData(two, { played: false, progress: 0.4 });

    updateCardUserData('p1', { played: true });
    for (const element of [one, two]) {
      expect(element.classList.contains('is-played')).toBe(true);
      expect(element.querySelector('.media-progress-bar')).toBeNull();
    }
    expect(__test.cache.get('p1').summary.played).toBe(true);

    window.dispatchEvent(new CustomEvent(PLAYED_CHANGED_EVENT, { detail: { id: 'p1', played: false } }));
    expect(one.classList.contains('is-played')).toBe(false);
    expect(one.querySelector('.media-card-played')).toBeNull();
    expect(__test.cache.get('p1').summary.played).toBe(false);
  });

  it('fills the bar of a series marked watched', () => {
    const series = card({ id: 'ser', type: 'Series', subtitle: '1 Staffel' });
    updateCardUserData('ser', { played: true });
    expect(series.querySelector('.media-progress-fill').style.width).toBe('100%');
  });
});
