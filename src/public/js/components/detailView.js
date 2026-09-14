import { createElement } from '../utils/dom.js';
import { createPosterPlaceholder } from '../utils/poster.js';
import { createExpandableText } from './expandableText.js';
import { createMetaIcon, metaIconFor } from './metaIcons.js';

// Two lines on phones, a little more room on wide screens.
const overviewLines = () => (window.matchMedia?.('(max-width: 768px)').matches ? 2 : 3);

export function DetailView({ item, actions, favoriteButton, playedButton = null, castSection, seasonsSection, similarSection, statusContent = null }) {
  const container = createElement('div', { className: 'page-container' });

  const genreTags = (item.genres || []).map(genre =>
    createElement('span', { className: 'genre-tag' }, genre)
  );

  const metadataItems = [];
  const pill = (icon, text, className = '') =>
    createElement('span', { className: `metadata-item ${className}`.trim() }, createMetaIcon(icon), createElement('span', {}, text));

  if (item.year) {
    metadataItems.push(pill('year', item.year));
  }

  if (item.duration) {
    metadataItems.push(pill('runtime', item.duration));
  }

  if (item.typeLabel) {
    metadataItems.push(pill(metaIconFor(item.typeLabel), item.typeLabel));
  }

  if (item.fsk) {
    metadataItems.push(pill('age', item.fsk, 'FSK'));
  }

  if (item.rating) {
    metadataItems.push(pill('star', Number(item.rating).toFixed(1), 'rating'));
  }

  if (item.criticRating) {
    metadataItems.push(pill('critic', `${item.criticRating}%`, 'rating'));
  }

  const crewInfo = [];

  if (item.directors && item.directors.length > 0) {
    crewInfo.push(createElement('p', {}, [
      createElement('strong', {}, 'Regie: '),
      item.directors.join(', ')
    ]));
  }

  if (item.studios && item.studios.length > 0) {
    crewInfo.push(createElement('p', {}, [
      createElement('strong', {}, 'Studio: '),
      item.studios.join(', ')
    ]));
  }

  const actionButtons = (actions || []).map(action => {
    const btn = createElement('button', {
      className: action.className || 'btn-primary',
      onClick: action.onClick
    });
    if (action.icon) {
      btn.innerHTML = `${action.icon}${action.label}`;
    } else {
      btn.textContent = action.label;
    }
    return btn;
  });

  if (favoriteButton) {
    actionButtons.push(favoriteButton);
  }

  if (playedButton) {
    actionButtons.push(playedButton);
  }

  const posterImg = createElement('img', {
    src: item.posterUrl || createPosterPlaceholder(item.name || '?'),
    alt: item.name
  });

  if (item.posterUrl) {
    posterImg.onerror = (e) => {
      e.currentTarget.onerror = null;
      e.currentTarget.src = createPosterPlaceholder(item.name || '?');
    };
  }

  const episodeTitleEl = item.episodeTitle
    ? createElement('div', { className: 'detail-episode-title' }, item.episodeTitle)
    : null;

  const originalTitleEl = item.originalTitle
    ? createElement('span', { className: 'detail-original-title' }, `(Originaltitel: ${item.originalTitle})`)
    : null;

  const taglineEl = item.tagline
    ? createElement('p', { className: 'detail-tagline' }, `\u201E${item.tagline}\u201C`)
    : null;

  const detailPageEl = createElement('div', { className: 'detail-page' },
    createElement('div', {
      className: 'detail-hero-backdrop',
      style: item.backdropUrl ? { backgroundImage: `url('${item.backdropUrl}')` } : {}
    }),
    createElement('div', { className: 'detail-content' },
      createElement('div', { className: 'detail-hero-main' },
        createElement('div', { className: 'detail-poster' },
          posterImg
        ),
        // Title and facts sit next to the poster on phones, everything else
        // runs below across the full width (see extended-responsive.css).
        createElement('div', { className: 'detail-info-head' },
          createElement('h1', { className: 'detail-title' },
            item.name,
            originalTitleEl
          ),
          episodeTitleEl,
          metadataItems.length > 0 ? createElement('div', { className: 'detail-metadata' }, metadataItems) : null
        ),
        createElement('div', { className: 'detail-info' },
          genreTags.length > 0 ? createElement('div', { className: 'detail-genres' }, genreTags) : null,
          taglineEl,
          statusContent,
          actionButtons.length > 0 ? createElement('div', { className: 'detail-actions' }, actionButtons) : null,
          item.overview
            ? createExpandableText({ text: item.overview, lines: overviewLines(), className: 'detail-overview' })
            : null,
          crewInfo.length > 0 ? createElement('div', { className: 'detail-crew' }, crewInfo) : null
        )
      )
    )
  );

  container.appendChild(detailPageEl);

  const extraSections = [castSection, seasonsSection].filter(Boolean);
  if (extraSections.length > 0) {
    container.appendChild(
      createElement('div', { className: 'content-section detail-extra-section' }, extraSections)
    );
  }

  if (similarSection) {
    container.appendChild(
      createElement('div', { className: 'content-section detail-similar-section' },
        similarSection
      )
    );
  }

  return container;
}
