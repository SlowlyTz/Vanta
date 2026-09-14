import { describe, it, expect, vi, afterEach } from 'vitest';
import { Footer } from '../../../src/public/js/components/footer.js';

describe('Footer', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('renders one slim line with brand, the main routes and the copyright', () => {
    const footer = Footer();

    expect(footer.tagName).toBe('FOOTER');
    expect(footer.querySelector('.footer-brand').getAttribute('href')).toBe('#/home');
    const hrefs = Array.from(footer.querySelectorAll('.footer-link')).map(link => link.getAttribute('href'));
    expect(hrefs).toEqual(['#/home', '#/movies', '#/series', '#/publishers', '#/profile', '#/requests/mine', '#/scroller']);
    expect(footer.querySelector('.footer-title')).toBeNull();
  });

  it('shows the current year in the copyright', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-06-01T00:00:00Z'));
    expect(Footer().querySelector('.footer-copyright').textContent).toContain('© 2031 VANTA');
  });
});
