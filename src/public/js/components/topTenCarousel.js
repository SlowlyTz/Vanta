// "Top 10 Filme/Serien heute": the rank as a large number half behind the
// poster, filled with the cover's colours once the poster has loaded.
import { createElement } from '../utils/dom.js';
import { MediaCard } from './mediaCard.js';
import { HorizontalCarousel } from './horizontalCarousel.js';
import { whenCoverColors, rgbText } from '../utils/coverColors.js';

function paintRank(item, card) {
  const img = card.querySelector('img');
  if (!img) return;
  whenCoverColors(img).then(colors => {
    if (!colors) return;
    item.style.setProperty('--rank-from', rgbText(colors.primaryVivid));
    item.style.setProperty('--rank-to', rgbText(colors.secondaryVivid));
    item.classList.add('has-cover-colors');
  });
}

export function TopTenCarousel({ title, items = [] }) {
  if (!items.length) return null;

  const carouselItems = items.map((entry, index) => {
    const rank = index + 1;
    const card = MediaCard({ item: entry });
    const item = createElement('div', { className: `top10-item${rank >= 10 ? ' is-wide' : ''}` },
      createElement('span', { className: 'top10-rank', 'aria-hidden': 'true', dataset: { rank: String(rank) } }, String(rank)),
      card
    );
    // Screen readers hear the rank with the title.
    card.setAttribute('aria-label', `Platz ${rank}: ${entry.Name}`);
    paintRank(item, card);
    return item;
  });

  return HorizontalCarousel({
    title,
    items: carouselItems,
    trackClass: 'media-carousel top10-carousel',
    containerClass: 'media-carousel-container top10-container'
  });
}
