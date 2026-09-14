import { describe, it, expect, vi, afterEach } from 'vitest';
import { createExpandableText } from '../../../src/public/js/components/expandableText.js';

// jsdom has no layout: scrollHeight is stubbed per test to drive the clamp.
function layoutWith({ lineHeight = 20, heightFor }) {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get() { return heightFor(this); }
  });
  const style = vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({ lineHeight: `${lineHeight}px` }));
  return () => {
    if (original) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', original);
    else delete HTMLElement.prototype.scrollHeight;
    style.mockRestore();
  };
}

describe('createExpandableText', () => {
  let restore = null;
  afterEach(() => { restore?.(); restore = null; });

  it('shows the whole text when nothing can be measured', () => {
    const el = createExpandableText({ text: 'Ein kurzer Text.', lines: 2 });
    expect(el.querySelector('.expandable-text-body').textContent).toBe('Ein kurzer Text.');
    expect(el.querySelector('.expandable-text-toggle')).toBeNull();
  });

  it('measures on the first width change and toggles between cut and full text', () => {
    restore = layoutWith({ heightFor: (el) => Math.max(1, Math.ceil(el.textContent.trim().split(/\s+/).length / 10)) * 20 });
    const callbacks = [];
    const observe = vi.fn();
    globalThis.ResizeObserver = class { constructor(cb) { callbacks.push(cb); } observe = observe; disconnect() {} };

    const words = Array.from({ length: 45 }, (_, i) => `w${i + 1}`);
    const el = createExpandableText({ text: words.join(' '), lines: 2 });
    document.body.appendChild(el);
    callbacks[0]([{ contentRect: { width: 300 } }]);

    const body = el.querySelector('.expandable-text-body');
    const toggle = el.querySelector('.expandable-text-toggle');
    expect(el.classList.contains('is-clamped')).toBe(true);
    expect(body.textContent).toMatch(/…\s*mehr lesen$/);
    // "w19 …" plus the link still fit in two lines of ten words, w20 would not
    expect(body.textContent.startsWith('w1 w2')).toBe(true);
    expect(body.textContent).not.toContain('w20');

    toggle.click();
    expect(el.classList.contains('is-expanded')).toBe(true);
    expect(toggle.textContent).toBe('weniger anzeigen');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(body.textContent).toContain('w45');

    toggle.click();
    el.dispatchEvent(new Event('transitionend'));
    expect(el.classList.contains('is-expanded')).toBe(false);
    expect(body.textContent).toMatch(/…\s*mehr lesen$/);
    el.remove();
    delete globalThis.ResizeObserver;
  });
});
