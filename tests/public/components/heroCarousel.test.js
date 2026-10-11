import { describe, it, expect, vi, afterEach } from 'vitest';
import { HeroCarousel } from '../../../src/public/js/components/heroCarousel.js';

function makeItem(overrides = {}) {
  return {
    Id: 'item-1',
    Name: 'Test Movie',
    Type: 'Movie',
    ProductionYear: 2021,
    Overview: 'A test overview.',
    ...overrides
  };
}

describe('HeroCarousel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders only the meta pills for fields that are present on the item', () => {
    const item = makeItem({
      OfficialRating: 'FSK 12',
      RunTimeTicks: null,
      CommunityRating: null,
      PremiereDate: '2021-05-01'
    });

    const el = HeroCarousel({ items: [item] });
    const pills = el.querySelectorAll('.home-hero-metadata .meta-pill');
    const pillTexts = Array.from(pills).map(pill => pill.textContent);

    expect(pillTexts.some(text => text.includes('FSK 12'))).toBe(true);
    expect(pillTexts.some(text => text.includes('2021'))).toBe(true);
    expect(pills).toHaveLength(2);
  });

  it('renders no meta-pill group when no metadata fields are present', () => {
    const item = makeItem({
      ProductionYear: null,
      OfficialRating: null,
      RunTimeTicks: null,
      CommunityRating: null,
      PremiereDate: null
    });

    const el = HeroCarousel({ items: [item] });
    expect(el.querySelector('.home-hero-metadata')).toBeNull();
  });

  it('falls back to a text title when the item has no Logo image tag', () => {
    const item = makeItem({ ImageTags: { Primary: 'abc' } });

    const el = HeroCarousel({ items: [item] });
    expect(el.querySelector('.home-hero-title')?.textContent).toBe('Test Movie');
    expect(el.querySelector('.home-hero-logo')).toBeNull();
  });

  it('renders a logo image when the item has a Logo image tag', () => {
    const item = makeItem({ ImageTags: { Logo: 'logo-tag' } });

    const el = HeroCarousel({ items: [item] });
    const logo = el.querySelector('.home-hero-logo');
    expect(logo).toBeTruthy();
    expect(logo.getAttribute('alt')).toBe('Test Movie');
    expect(el.querySelector('.home-hero-title')).toBeNull();
  });

  it('renders a round info button that navigates to the item detail page', () => {
    const item = makeItem();
    const el = HeroCarousel({ items: [item] });

    const infoBtn = el.querySelector('.btn-hero-info');
    expect(infoBtn).toBeTruthy();
    expect(infoBtn.getAttribute('aria-label')).toBe('Test Movie Details öffnen');

    infoBtn.click();
    expect(window.location.hash).toBe('#/item/item-1');
  });

  it('does not render slide position dots', () => {
    const el = HeroCarousel({ items: [makeItem(), makeItem({ Id: 'item-2' })] });

    expect(el.querySelector('.hero-carousel-dots')).toBeNull();
    expect(el.querySelector('.hero-carousel-dot')).toBeNull();
  });

  describe('auto-advance timer', () => {
    const activeIndex = (el) => Array.from(el.querySelectorAll('.hero-slide-content'))
      .findIndex(content => content.classList.contains('active'));

    it('stops for good once the page that held it is cleared', () => {
      vi.useFakeTimers();
      const page = document.createElement('main');
      document.body.appendChild(page);
      const el = HeroCarousel({ items: [makeItem({ Id: 'a' }), makeItem({ Id: 'b' })] });
      page.appendChild(el);

      vi.advanceTimersByTime(8000);
      expect(activeIndex(el)).toBe(1);

      page.innerHTML = '';
      vi.advanceTimersByTime(8000);
      expect(vi.getTimerCount()).toBe(0);
      expect(activeIndex(el)).toBe(1);
      page.remove();
    });

    it('waits while still detached and starts once attached', () => {
      vi.useFakeTimers();
      const el = HeroCarousel({ items: [makeItem({ Id: 'a' }), makeItem({ Id: 'b' })] });
      vi.advanceTimersByTime(8000);
      expect(activeIndex(el)).toBe(0);
      expect(vi.getTimerCount()).toBe(1);

      document.body.appendChild(el);
      vi.advanceTimersByTime(8000);
      expect(activeIndex(el)).toBe(1);
      el.destroyCarousel();
      el.remove();
    });

    it('goes on after the pointer leaves again', () => {
      vi.useFakeTimers();
      const el = HeroCarousel({ items: [makeItem({ Id: 'a' }), makeItem({ Id: 'b' })] });
      document.body.appendChild(el);

      el.dispatchEvent(new Event('mouseenter'));
      vi.advanceTimersByTime(16000);
      expect(activeIndex(el)).toBe(0);

      el.dispatchEvent(new Event('mouseleave'));
      vi.advanceTimersByTime(8000);
      expect(activeIndex(el)).toBe(1);
      el.destroyCarousel();
      el.remove();
    });
  });
});
