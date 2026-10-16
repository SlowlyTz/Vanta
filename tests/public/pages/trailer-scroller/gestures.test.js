import { describe, it, expect, vi, afterEach } from 'vitest';
import { bindGestures } from '../../../../src/public/js/pages/trailer-scroller/gestures.js';
import { openModal, closeAllModals } from '../../../../src/public/js/utils/modal.js';

const setup = () => {
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  document.documentElement.classList.add('tv-mode');
  const track = document.body.appendChild(document.createElement('div'));
  const ctx = { track, onCleanup: () => {}, shareModal: null, state: { introOpen: false, trailers: [], activeIndex: 0 }, navigateRelative: vi.fn() };
  bindGestures(ctx);
  return ctx;
};
const arrow = (key = 'ArrowDown') => new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

describe('trailer scroller keys on a TV', () => {
  afterEach(() => {
    closeAllModals();
    document.documentElement.classList.remove('tv-mode');
    document.body.innerHTML = '';
  });

  it('up/down change the trailer', () => {
    const ctx = setup();
    const event = arrow();
    ctx.handleKeydown(event);
    expect(ctx.navigateRelative).toHaveBeenCalledWith(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leave up/down to an open dialog', () => {
    const ctx = setup();
    const overlay = document.body.appendChild(document.createElement('div'));
    const dialog = overlay.appendChild(document.createElement('div'));
    dialog.appendChild(document.createElement('button'));
    openModal({ overlay, dialog });

    const event = arrow('ArrowUp');
    ctx.handleKeydown(event);
    expect(ctx.navigateRelative).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
