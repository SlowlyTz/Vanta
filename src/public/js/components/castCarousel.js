import { createElement } from '../utils/dom.js';
import { PERSON_PLACEHOLDER_URL, getPersonImageUrl } from '../utils/image.js';
import { HorizontalCarousel } from './horizontalCarousel.js';

export function CastCarousel({ actors = [], onActorClick, title = 'Besetzung' }) {
  if (!actors || actors.length === 0) return null;

  const actorCards = actors.map(actor => {
    // The list item holds a real button, so the actor opens by keyboard too.
    return createElement('div', { className: 'cast-card', role: 'listitem' },
      createElement('button', {
        type: 'button',
        className: 'cast-card-button',
        'aria-label': actor.Role ? `${actor.Name} als ${actor.Role}` : actor.Name,
        onClick: () => {
          if (onActorClick) onActorClick(actor);
        }
      },
      createElement('img', {
        src: actor.profileUrl || getPersonImageUrl(actor, 120),
        alt: actor.Name,
        className: 'cast-avatar',
        loading: 'lazy',
        onError: (event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = PERSON_PLACEHOLDER_URL;
        }
      }),
      createElement('div', { className: 'cast-name' }, actor.Name),
      actor.Role ? createElement('div', { className: 'cast-role' }, actor.Role) : null
      )
    );
  });

  return HorizontalCarousel({
    title,
    items: actorCards,
    trackClass: 'cast-list',
    containerClass: 'detail-cast-section'
  });
}
