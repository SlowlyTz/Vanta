import { describe, it, expect } from 'vitest';
import { createSectionLoader, setSectionBusy } from './loader.js';

describe('createSectionLoader', () => {
  it('renders an accessible status region with a visible label', () => {
    const loader = createSectionLoader({ label: 'Filme werden geladen' });

    expect(loader.getAttribute('role')).toBe('status');
    expect(loader.getAttribute('aria-live')).toBe('polite');
    expect(loader.classList.contains('section-loader')).toBe(true);
    expect(loader.querySelector('.section-loader-label').textContent).toBe('Filme werden geladen');
    expect(loader.querySelector('.section-loader-spinner')).toBeTruthy();
  });

  it('defaults to a generic label when none is given', () => {
    const loader = createSectionLoader();
    expect(loader.querySelector('.section-loader-label').textContent).toBe('Lädt…');
  });

  it('applies the compact variant class without changing the markup shape', () => {
    const loader = createSectionLoader({ label: 'Mehr laden', compact: true });

    expect(loader.classList.contains('section-loader')).toBe(true);
    expect(loader.classList.contains('section-loader-compact')).toBe(true);
  });

  it('never sets a fixed position or a global id/z-index on the element', () => {
    const loader = createSectionLoader();

    expect(loader.id).toBe('');
    expect(loader.style.position).not.toBe('fixed');
    expect(loader.style.zIndex).toBe('');
  });
});

describe('setSectionBusy', () => {
  it('sets aria-busy=true while loading and removes it afterwards', () => {
    const el = document.createElement('div');

    setSectionBusy(el, true);
    expect(el.getAttribute('aria-busy')).toBe('true');

    setSectionBusy(el, false);
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });
});
