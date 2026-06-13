import { createElement } from '../utils/dom.js';
import { createPersonPlaceholderSvg, getPersonImageUrl } from '../utils/image.js';
import { HorizontalCarousel } from './horizontalCarousel.js';

export function CastCarousel({ actors = [], onActorClick }) {
  if (!actors || actors.length === 0) return null;

  const actorCards = actors.map(actor => {
    const actorPlaceholder = createPersonPlaceholderSvg(actor.Name || '');
    
    return createElement('div', {
      className: 'cast-card',
      style: { cursor: 'pointer' },
      onClick: () => {
        if (onActorClick) onActorClick(actor);
      }
    },
      createElement('img', {
        src: getPersonImageUrl(actor, 120),
        alt: actor.Name,
        className: 'cast-avatar',
        loading: 'lazy',
        onError: (event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = actorPlaceholder;
        }
      }),
      createElement('div', { className: 'cast-name' }, actor.Name),
      actor.Role ? createElement('div', { className: 'cast-role' }, actor.Role) : null
    );
  });

  return HorizontalCarousel({
    title: 'Besetzung',
    items: actorCards,
    trackClass: 'cast-list',
    containerClass: 'detail-cast-section'
  });
}
