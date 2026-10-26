// The "gesehen" check badge in the corner of a media card.
import { createElement } from '../utils/dom.js';

export function createPlayedBadge() {
  const badge = createElement('div', { className: 'media-card-played', title: 'Gesehen', 'aria-label': 'Gesehen' });
  badge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
  return badge;
}
