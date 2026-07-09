import { createElement } from '../utils/dom.js';
import { getItemImageUrl } from '../utils/image.js';
import { formatYear } from '../utils/format.js';
import { markReturnFromDetail } from '../utils/routeState.js';

export function MediaCard({ item, landscape = false, sourceType = null }) {
  if (!item) return null;

  const isEpisode = item.Type === 'Episode';
  const imageType = landscape ? 'Backdrop' : 'Primary';
  const imageUrl = getItemImageUrl(item, imageType);

  // Playback progress for resumable items
  let progressPercent = 0;
  if (item.UserData && item.UserData.PlaybackPositionTicks && item.RunTimeTicks) {
    progressPercent = (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100;
  }

  let cardTitle = item.Name;
  let cardSubtitle = '';

  if (isEpisode) {
    cardTitle = item.SeriesName || item.Name;
    cardSubtitle = `S${String(item.ParentIndexNumber || 1).padStart(2, '0')}E${String(item.IndexNumber || 1).padStart(2, '0')} - ${item.Name}`;
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
    src: imageUrl,
    alt: item.Name,
    className: 'media-card-image',
    loading: 'lazy'
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

  const card = createElement('div', {
    className: `media-card ${landscape ? 'landscape' : ''}`,
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
