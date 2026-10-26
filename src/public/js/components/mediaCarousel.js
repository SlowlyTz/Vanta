// Carousel row of media cards with an optional "Alle anzeigen" link.
import { createElement } from '../utils/dom.js';
import { MediaCard } from './mediaCard.js';
import { HorizontalCarousel } from './horizontalCarousel.js';

export function MediaCarousel({ title, items = [], landscape = false, href = null, actionLabel = 'Alle anzeigen', resumeRow = false }) {
  if (!items || items.length === 0) return null;

  const carouselItems = items.map(item => {
    const cardEl = MediaCard({ item, landscape });
    return createElement('div', { className: 'media-carousel-item' }, cardEl);
  });

  const carousel = HorizontalCarousel({
    title,
    items: carouselItems,
    trackClass: `media-carousel ${landscape ? 'landscape-carousel' : ''}`,
    containerClass: 'media-carousel-container',
    href,
    actionLabel
  });
  // "Weiter schauen": its cards offer "Aus Weiter schauen entfernen".
  if (resumeRow && carousel) carousel.dataset.resumeRow = 'true';
  return carousel;
}
