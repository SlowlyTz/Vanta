import { describe, it, expect, vi, afterEach } from 'vitest';
import { createScrollerViewportLock } from '../../../../src/public/js/pages/trailer-scroller/viewport.js';

describe('createScrollerViewportLock', () => {
  afterEach(() => {
    document.documentElement.classList.remove('trailer-scroller-active');
    document.body.classList.remove('trailer-scroller-active');
    document.body.style.top = '';
    vi.restoreAllMocks();
  });

  it('opens the full-screen scroller at the viewport origin even when entered from the footer', () => {
    const fakeWindow = {
      scrollY: 1460,
      scrollTo: vi.fn()
    };
    const viewportLock = createScrollerViewportLock(fakeWindow, document);

    viewportLock.lock();

    expect(document.documentElement.classList.contains('trailer-scroller-active')).toBe(true);
    expect(document.body.classList.contains('trailer-scroller-active')).toBe(true);
    expect(document.body.style.top).toBe('0px');
  });

  it('restores the previous page position after leaving the scroller', () => {
    const fakeWindow = {
      scrollY: 820,
      scrollTo: vi.fn()
    };
    const viewportLock = createScrollerViewportLock(fakeWindow, document);

    viewportLock.lock();
    viewportLock.unlock();

    expect(fakeWindow.scrollTo).toHaveBeenCalledWith(0, 820);
    expect(viewportLock.isLocked()).toBe(false);
  });

  it('does not apply or restore the lock more than once', () => {
    const fakeWindow = {
      scrollY: 400,
      scrollTo: vi.fn()
    };
    const viewportLock = createScrollerViewportLock(fakeWindow, document);

    viewportLock.lock();
    fakeWindow.scrollY = 900;
    viewportLock.lock();
    viewportLock.unlock();
    viewportLock.unlock();

    expect(fakeWindow.scrollTo).toHaveBeenCalledTimes(1);
    expect(fakeWindow.scrollTo).toHaveBeenCalledWith(0, 400);
  });
});
