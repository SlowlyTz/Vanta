import { describe, it, expect } from 'vitest';
import { createHeroSkeleton, createCarouselSkeleton } from '../../../src/public/js/components/skeleton.js';

describe('skeletons', () => {
  it('builds a hero placeholder in the hero footprint with a status label', () => {
    const hero = createHeroSkeleton();
    expect(hero.classList.contains('home-hero')).toBe(true);
    expect(hero.querySelector('.home-hero-content').getAttribute('aria-hidden')).toBe('true');
    const status = hero.querySelector('.section-loader');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe('Startseite wird geladen');
  });

  it('builds a carousel placeholder with the requested cards and title', () => {
    const carousel = createCarouselSkeleton({ title: 'Kategorien', label: 'Kategorien werden geladen', count: 6 });
    expect(carousel.classList.contains('media-carousel-container')).toBe(true);
    expect(carousel.querySelector('.carousel-title-text').textContent).toBe('Kategorien');
    expect(carousel.querySelectorAll('.media-carousel-item .skeleton-card')).toHaveLength(6);
    expect(carousel.querySelector('.skeleton-track').getAttribute('aria-hidden')).toBe('true');
    expect(carousel.textContent).toContain('Kategorien werden geladen');
  });

  it('uses landscape cards and featured item widths when asked', () => {
    const landscape = createCarouselSkeleton({ landscape: true, count: 2 });
    expect(landscape.querySelectorAll('.skeleton-card.landscape')).toHaveLength(2);
    expect(landscape.querySelector('.media-carousel').classList.contains('landscape-carousel')).toBe(true);

    const featured = createCarouselSkeleton({ featured: true, count: 3 });
    expect(featured.querySelectorAll('.featured-carousel-item.large')).toHaveLength(3);
  });
});
