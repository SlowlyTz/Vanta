// "Besetzung & Crew" on the detail page: direction and script first, marked
// by their job, then the cast as portrait cards; each person opens their
// titles.
import { createElement } from '../utils/dom.js';
import { PERSON_PLACEHOLDER_URL, getPersonImageUrl } from '../utils/image.js';
import { HorizontalCarousel } from './horizontalCarousel.js';

function personCard(person, { job = null, onSelect }) {
  const caption = job || person.Role || '';
  return createElement('div', { className: `person-card${job ? ' is-crew' : ''}`, role: 'listitem' },
    createElement('button', {
      type: 'button',
      className: 'person-card-button',
      dataset: { tvKey: `person-${person.Id}-${job || 'cast'}` },
      'aria-label': caption ? `${person.Name}, ${caption}` : person.Name,
      onClick: () => onSelect?.(person)
    },
    createElement('span', { className: 'person-card-photo' },
      createElement('img', {
        src: getPersonImageUrl(person, 240),
        alt: '',
        loading: 'lazy',
        onError: (event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = PERSON_PLACEHOLDER_URL;
        }
      }),
      job ? createElement('span', { className: 'person-card-job' }, job) : null
    ),
    createElement('span', { className: 'person-card-name' }, person.Name),
    !job && person.Role ? createElement('span', { className: 'person-card-role' }, person.Role) : null
    )
  );
}

export function CastCrewSection({ crew = [], actors = [], onSelect }) {
  const cards = [
    ...crew.map(person => personCard(person, { job: person.job, onSelect })),
    ...actors.map(person => personCard(person, { onSelect }))
  ];
  if (!cards.length) return null;
  return HorizontalCarousel({
    title: crew.length && actors.length ? 'Besetzung & Crew' : crew.length ? 'Crew' : 'Besetzung',
    items: cards,
    trackClass: 'person-list',
    containerClass: 'detail-cast-section'
  });
}
