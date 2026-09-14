import { createElement } from '../utils/dom.js';
import { createSectionLoader } from './loader.js';

// Placeholder blocks in the exact footprint of the hero and the carousels, so
// the home page keeps its layout while data arrives. Each skeleton carries a
// visually hidden section loader for the status text screen readers get.

const bar = (className) => createElement('span', { className: `skeleton-bar ${className}`.trim() });

function skeletonCard(landscape) {
  return createElement('div', { className: `skeleton-card${landscape ? ' landscape' : ''}` },
    createElement('div', { className: 'skeleton-card-image' }),
    createElement('div', { className: 'skeleton-card-details' },
      bar('skeleton-bar-title'),
      bar('skeleton-bar-subtitle')
    )
  );
}

export function createHeroSkeleton({ label = 'Startseite wird geladen' } = {}) {
  return createElement('div', { className: 'home-hero home-hero-skeleton' },
    createElement('div', { className: 'home-hero-backdrop skeleton-hero-backdrop', 'aria-hidden': 'true' }),
    createElement('div', { className: 'home-hero-content skeleton-hero-content', 'aria-hidden': 'true' },
      bar('skeleton-bar-hero-title'),
      createElement('div', { className: 'skeleton-hero-meta' }, bar('skeleton-bar-pill'), bar('skeleton-bar-pill'), bar('skeleton-bar-pill')),
      bar('skeleton-bar-text'),
      bar('skeleton-bar-text short'),
      createElement('div', { className: 'skeleton-hero-actions' }, bar('skeleton-bar-button'), bar('skeleton-bar-button secondary'))
    ),
    createSectionLoader({ label, className: 'skeleton-status' })
  );
}

// `featured` mirrors FeaturedMediaCarousel's larger item width.
export function createCarouselSkeleton({ title = null, label = 'Wird geladen', landscape = false, featured = false, count = 8, className = '' } = {}) {
  const itemClass = featured ? 'featured-carousel-item large' : 'media-carousel-item';
  const items = Array.from({ length: count }, () =>
    createElement('div', { className: itemClass }, skeletonCard(landscape))
  );

  return createElement('div', {
    className: `media-carousel-container skeleton-carousel ${className}`.trim()
  },
    createElement('div', { className: 'carousel-header' },
      title
        ? createElement('h3', { className: 'carousel-title-text' }, title)
        : bar('skeleton-bar-heading')
    ),
    createElement('div', { className: `media-carousel${landscape ? ' landscape-carousel' : ''} skeleton-track`, 'aria-hidden': 'true' }, items),
    createSectionLoader({ label, className: 'skeleton-status' })
  );
}
