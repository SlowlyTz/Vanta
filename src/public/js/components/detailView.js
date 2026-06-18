import { createElement } from '../utils/dom.js';
import { createPosterPlaceholder } from '../utils/poster.js';

export function DetailView({ item, actions, castSection, seasonsSection, similarSection }) {
  const container = createElement('div', { className: 'page-container' });

  const genreTags = (item.genres || []).map(genre =>
    createElement('span', { className: 'genre-tag' }, genre)
  );

  const metadataItems = [];

  if (item.year) {
    metadataItems.push(createElement('span', { className: 'metadata-item' }, item.year));
  }

  if (item.duration) {
    metadataItems.push(createElement('span', { className: 'metadata-item' }, item.duration));
  }

  if (item.typeLabel) {
    metadataItems.push(createElement('span', { className: 'metadata-item' }, item.typeLabel));
  }

  if (item.fsk) {
    metadataItems.push(createElement('span', { className: 'metadata-item FSK' }, item.fsk));
  }

  if (item.rating) {
    metadataItems.push(createElement('span', { className: 'metadata-item rating' }, `⭐ ${Number(item.rating).toFixed(1)}`));
  }

  if (item.criticRating) {
    metadataItems.push(createElement('span', { className: 'metadata-item rating' }, `🍅 ${item.criticRating}%`));
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
        createElement('div', { className: 'detail-info' },
          createElement('h1', { className: 'detail-title' },
            item.name,
            originalTitleEl
          ),
          episodeTitleEl,
          metadataItems.length > 0 ? createElement('div', { className: 'detail-metadata' }, metadataItems) : null,
          genreTags.length > 0 ? createElement('div', { className: 'detail-genres' }, genreTags) : null,
          taglineEl,
          actionButtons.length > 0 ? createElement('div', { className: 'detail-actions' }, actionButtons) : null,
          createElement('p', { className: 'detail-overview' }, item.overview),
          crewInfo.length > 0 ? createElement('div', { className: 'detail-crew' }, crewInfo) : null
        )
      ),
      castSection,
      seasonsSection
    )
  );

  container.appendChild(detailPageEl);

  if (similarSection) {
    container.appendChild(
      createElement('div', { className: 'content-section detail-similar-section' },
        similarSection
      )
    );
  }

  return container;
}