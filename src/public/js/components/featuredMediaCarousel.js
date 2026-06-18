import { createElement } from '../utils/dom.js';
import { MediaCard } from './mediaCard.js';
import { HorizontalCarousel } from './horizontalCarousel.js';

export function FeaturedMediaCarousel({ title, items = [], cardSize = 'large' }) {
  if (!items || items.length === 0) return null;

  const carouselItems = items.map(item => {
    const cardEl = MediaCard({ item, landscape: false });
    return createElement('div', { className: `featured-carousel-item ${cardSize}` }, cardEl);
  });

  return HorizontalCarousel({
    title,
    items: carouselItems,
    trackClass: `featured-carousel ${cardSize}`,
    containerClass: 'featured-carousel-container'
  });
}
