import { describe, it, expect, vi, afterEach } from 'vitest';
import { bindFocusBackdrop } from '../../../src/public/js/tv/focusBackdrop.js';

describe('bindFocusBackdrop', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the backdrop of the card the focus settled on', () => {
    vi.useFakeTimers();
    window.requestAnimationFrame = cb => setTimeout(cb, 0);
    document.body.innerHTML = '<div data-tv-backdrop><a class="media-card" href="#" data-item-id="a" data-backdrop-id="a" data-backdrop-tag="t1">a</a><a class="media-card" href="#" data-item-id="b" data-backdrop-id="b" data-backdrop-tag="t2">b</a></div>';
    const unbind = bindFocusBackdrop();
    const [a, b] = document.querySelectorAll('.media-card');
    a.focus();
    vi.advanceTimersByTime(100);
    b.focus();
    vi.advanceTimersByTime(300);
    const images = document.querySelectorAll('.tv-focus-backdrop-image');
    expect(images).toHaveLength(1);
    expect(images[0].style.backgroundImage).toContain('/b');
    expect(images[0].style.backgroundImage).toContain('t2');
    unbind();
    document.body.innerHTML = '';
  });

  it('shows nothing for a card whose page is gone or did not ask for it', () => {
    vi.useFakeTimers();
    window.requestAnimationFrame = cb => setTimeout(cb, 0);
    document.body.innerHTML = '<div data-tv-backdrop><a class="media-card" href="#" data-item-id="a" data-backdrop-id="a" data-backdrop-tag="t1">a</a></div><a class="media-card" href="#" data-item-id="c" data-backdrop-id="c" data-backdrop-tag="t3">c</a>';
    const unbind = bindFocusBackdrop();
    const [a, c] = document.querySelectorAll('.media-card');
    a.focus();
    // OK before the delay: the next page replaces the card.
    a.closest('[data-tv-backdrop]').remove();
    window.dispatchEvent(new CustomEvent('vanta:page-shown', { detail: { hash: '#/item/a' } }));
    vi.advanceTimersByTime(400);
    expect(document.querySelectorAll('.tv-focus-backdrop-image')).toHaveLength(0);
    c.focus();
    vi.advanceTimersByTime(400);
    expect(document.querySelectorAll('.tv-focus-backdrop-image')).toHaveLength(0);
    unbind();
    document.body.innerHTML = '';
  });
});
