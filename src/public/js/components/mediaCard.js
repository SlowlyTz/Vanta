import { createElement } from '../utils/dom.js';
import { getItemImageSources } from '../utils/image.js';
import { formatYear } from '../utils/format.js';
import { markReturnFromDetail } from '../utils/routeState.js';
import { createPlayedToggle } from './playedToggle.js';
import { formatEpisodeCode } from '../shared/episodeCode.js';

export function MediaCard({ item, landscape = false, sourceType = null, playedToggle = false }) {
  if (!item) return null;

  const isEpisode = item.Type === 'Episode';
  const imageType = landscape ? 'Backdrop' : 'Primary';
  const image = getItemImageSources(item, imageType, landscape ? 'landscape' : 'poster');

  // Playback progress for resumable items
  let progressPercent = 0;
  if (item.UserData && item.UserData.PlaybackPositionTicks && item.RunTimeTicks) {
    progressPercent = (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100;
  }

  let cardTitle = item.Name;
  let cardSubtitle = '';

  if (isEpisode) {
    cardTitle = item.SeriesName || item.Name;
    cardSubtitle = `${formatEpisodeCode(item)} - ${item.Name}`;
  } else if (item.Type === 'Series') {
    if (item.ChildCount) {
      cardSubtitle = item.ChildCount === 1 ? '1 Staffel' : `${item.ChildCount} Staffeln`;
    } else {
      cardSubtitle = 'Serie';
    }
  } else {
    cardSubtitle = formatYear(item.PremiereDate || item.ProductionYear);
  }

  const imageEl = createElement('img', {
    src: image.src,
    srcset: image.srcset,
    sizes: image.sizes,
    alt: item.Name,
    className: 'media-card-image',
    loading: 'lazy',
    decoding: 'async'
  });

  const imageContainerChildren = [imageEl];

  if (progressPercent > 0) {
    imageContainerChildren.push(
      createElement('div', { className: 'media-progress-bar' },
        createElement('div', {
          className: 'media-progress-fill',
          style: { width: `${progressPercent}%` }
        })
      )
    );
  }

  // Type label badge for series
  if (item.Type === 'Series') {
    imageContainerChildren.push(
      createElement('div', { className: 'media-card-badge' }, 'SERIE')
    );
  } else if (item.Type === 'Movie') {
    imageContainerChildren.push(
      createElement('div', { className: 'media-card-badge' }, 'FILM')
    );
  }

  // Watched state, like Jellyfin's check on the card: a plain badge, or the
  // toggle itself where the card offers "mark as played" (episodes).
  const isPlayed = item.UserData?.Played === true;
  if (playedToggle) {
    imageContainerChildren.push(createPlayedToggle(item, {
      compact: true,
      onChange: (played) => {
        card.classList.toggle('is-played', played);
        if (played) card.querySelector('.media-progress-bar')?.remove();
      }
    }));
  } else if (isPlayed) {
    imageContainerChildren.push(createPlayedBadge());
  }

  const card = createElement('div', {
    className: `media-card ${landscape ? 'landscape' : ''}${isPlayed ? ' is-played' : ''}`,
    dataset: { itemId: item.Id },
    onClick: () => {
      markReturnFromDetail({ itemId: item.Id, sourceType });
      window.location.hash = `#/item/${item.Id}`;
    }
  },
    createElement('div', { className: 'media-card-image-container' },
      imageContainerChildren
    ),
    createElement('div', { className: 'media-card-details' },
      createElement('div', { className: 'media-card-title' }, cardTitle),
      cardSubtitle ? createElement('div', { className: 'media-card-subtitle' }, cardSubtitle) : null
    )
  );

  return card;
}

function createPlayedBadge() {
  const badge = createElement('div', { className: 'media-card-played', title: 'Gesehen', 'aria-label': 'Gesehen' });
  badge.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
  return badge;
}
