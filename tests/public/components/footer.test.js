import { describe, it, expect, vi, afterEach } from 'vitest';
import { Footer } from '../../../src/public/js/components/footer.js';

describe('Footer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the redesigned footer structure and all navigation groups', () => {
    const footer = Footer();

    expect(footer.tagName).toBe('FOOTER');
    expect(footer.querySelector('.footer-title')?.textContent)
      .toBe('Deine nächste Geschichte wartet schon.');
    expect(footer.querySelectorAll('.footer-link-group')).toHaveLength(2);
    expect(footer.querySelectorAll('.footer-link')).toHaveLength(8);
  });

  it('uses only existing application routes', () => {
    const footer = Footer();
    const hrefs = Array.from(footer.querySelectorAll('a')).map(link => link.getAttribute('href'));

    expect(hrefs).toEqual(expect.arrayContaining([
      '#/home',
      '#/movies',
      '#/series',
      '#/publishers',
      '#/profile',
      '#/requests/mine',
      '#/search',
      '#/scroller'
    ]));
    expect(hrefs.every(href => href.startsWith('#/'))).toBe(true);
  });

  it('renders the current year dynamically', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-04-08T10:00:00Z'));

    const footer = Footer();

    expect(footer.querySelector('.footer-copyright')?.textContent).toContain('© 2031 VANTA');
  });
});
