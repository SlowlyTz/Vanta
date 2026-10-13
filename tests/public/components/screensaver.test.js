import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createIdleWatch, openScreensaver, startScreensaver, isScreensaverOpen, resetScreensaverCache, SLIDE_MS } from '../../../src/public/js/components/screensaver.js';
import { closeAllModals } from '../../../src/public/js/utils/modal.js';

vi.mock('../../../src/public/js/utils/pageStyles.js', () => ({ ensurePageStyles: () => Promise.resolve() }));

describe('createIdleWatch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires after the idle time, and input starts over', () => {
    const onIdle = vi.fn();
    const watch = createIdleWatch({ timeoutMs: 10_000, onIdle });
    watch.start();
    vi.advanceTimersByTime(9_000);
    window.dispatchEvent(new Event('pointermove'));
    vi.advanceTimersByTime(9_000);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(onIdle).toHaveBeenCalledTimes(1);
    watch.stop();
  });

  it('holds while the tab is hidden and stops for good', () => {
    const onIdle = vi.fn();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'hidden' });
    const watch = createIdleWatch({ timeoutMs: 1_000, onIdle, doc });
    watch.start();
    vi.advanceTimersByTime(5_000);
    expect(onIdle).not.toHaveBeenCalled();
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    watch.stop();
    vi.advanceTimersByTime(5_000);
    expect(onIdle).not.toHaveBeenCalled();
  });
});

describe('openScreensaver', () => {
  const items = [
    { Id: 'a', Name: 'Dune', ProductionYear: 2021, OfficialRating: 'FSK-12', Genres: ['Sci-Fi'], Overview: 'Wüste.', BackdropImageTags: ['t1'] },
    { Id: 'b', Name: 'Heat', ProductionYear: 1995, BackdropImageTags: ['t2'] }
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    window.requestAnimationFrame = cb => setTimeout(cb, 0);
  });
  afterEach(() => {
    closeAllModals();
    vi.useRealTimers();
  });

  it('shows a title with the time and moves on every 12 seconds', () => {
    openScreensaver({ items, now: () => new Date(2026, 9, 12, 21, 5) });
    const root = document.querySelector('.screensaver');
    expect(root.querySelector('.screensaver-time').textContent).toBe('21:05');
    expect(root.querySelector('.screensaver-title').textContent).toBe('Dune');
    expect(root.querySelector('.screensaver-meta').textContent).toContain('FSK-12');
    vi.advanceTimersByTime(SLIDE_MS);
    expect(root.querySelector('.screensaver-title').textContent).toBe('Heat');
  });

  it('opens the shown title and ends on its button or Escape', () => {
    const onClose = vi.fn();
    openScreensaver({ items, onClose });
    document.querySelector('.screensaver-watch').click();
    expect(window.location.hash).toBe('#/item/a');
    expect(onClose).toHaveBeenCalledTimes(1);

    openScreensaver({ items, onClose });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.screensaver')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows the controls on input instead of ending', () => {
    openScreensaver({ items });
    const root = document.querySelector('.screensaver');
    vi.advanceTimersByTime(6_000);
    expect(root.classList.contains('show-controls')).toBe(false);
    root.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(root.classList.contains('show-controls')).toBe(true);
    expect(document.querySelector('.screensaver')).toBeTruthy();
  });
});

describe('startScreensaver', () => {
  const items = [{ Id: 'a', Name: 'Dune', BackdropImageTags: ['t1'] }];

  beforeEach(() => {
    window.requestAnimationFrame = cb => setTimeout(cb, 0);
    resetScreensaverCache();
  });
  afterEach(() => closeAllModals());

  it('loads the titles once and opens only one screensaver at a time', async () => {
    const api = { getScreensaverItems: vi.fn().mockResolvedValue({ items }) };
    const handle = await startScreensaver({ api });
    expect(handle).toBeTruthy();
    expect(isScreensaverOpen()).toBe(true);
    expect(await startScreensaver({ api })).toBeNull();
    expect(document.querySelectorAll('.screensaver').length).toBe(1);

    handle.close();
    expect(isScreensaverOpen()).toBe(false);
    await startScreensaver({ api });
    expect(api.getScreensaverItems).toHaveBeenCalledTimes(1);
  });

  it('opens nothing without titles', async () => {
    const api = { getScreensaverItems: vi.fn().mockResolvedValue({ items: [] }) };
    expect(await startScreensaver({ api })).toBeNull();
    expect(isScreensaverOpen()).toBe(false);
    expect(document.querySelector('.screensaver')).toBeNull();
  });
});
