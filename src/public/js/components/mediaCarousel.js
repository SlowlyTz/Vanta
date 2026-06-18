import { createElement } from '../utils/dom.js';
import { MediaCard } from './mediaCard.js';
import { HorizontalCarousel } from './horizontalCarousel.js';

export function MediaCarousel({ title, items = [], landscape = false, href = null, actionLabel = 'Alle anzeigen' }) {
  if (!items || items.length === 0) return null;

  const carouselItems = items.map(item => {
    const cardEl = MediaCard({ item, landscape });
    return createElement('div', { className: 'media-carousel-item' }, cardEl);
  });

  return HorizontalCarousel({
    title,
    items: carouselItems,
    trackClass: `media-carousel ${landscape ? 'landscape-carousel' : ''}`,
    containerClass: 'media-carousel-container',
    href,
    actionLabel
  });
}
