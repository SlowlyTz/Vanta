import { createElement } from '../../utils/dom.js';
import { createScrollerIcon } from './context.js';

export function bindSlideRenderer(ctx) {
  ctx.updateChrome = () => {
    const total = ctx.state.trailers.length;

    ctx.previousButton.disabled = total === 0 || ctx.state.activeIndex <= 0;
    ctx.nextButton.disabled = total === 0 || (ctx.state.activeIndex >= total - 1 && !ctx.state.hasMore) || ctx.state.loading;
    ctx.container.classList.toggle('is-feed-loading', ctx.state.loading);
  };

  ctx.showLoadingState = () => {
    if (ctx.state.trailers.length > 0) return;

    ctx.track.replaceChildren(
      createElement('div', {
        className: 'trailer-feed-state trailer-loading-state',
        role: 'status',
        'aria-live': 'polite'
      },
        createElement('div', { className: 'trailer-loading-preview', 'aria-hidden': 'true' },
          createElement('div', { className: 'trailer-loading-video' }),
          createElement('div', { className: 'trailer-loading-lines' },
            createElement('span', {}),
            createElement('span', {}),
            createElement('span', {})
          )
        ),
        createElement('p', { className: 'trailer-feed-state-title' }, 'Trailer werden vorbereitet'),
        createElement('p', { className: 'trailer-feed-state-text' }, 'VANTA lädt deine YouTube-Trailer und bereitet den ersten Player vor.')
      )
    );
  };

  ctx.showErrorState = error => {
    ctx.track.replaceChildren(
      createElement('div', {
        className: 'trailer-feed-state trailer-error-state',
        role: 'alert'
      },
        createScrollerIcon('retry', 'trailer-feed-state-icon'),
        createElement('p', { className: 'trailer-feed-state-title' }, 'Trailer konnten nicht geladen werden'),
        createElement('p', { className: 'trailer-feed-state-text' },
          error?.message || 'Bitte prüfe die Verbindung zu deiner Mediathek und versuche es erneut.'
        ),
        createElement('button', {
          className: 'trailer-feed-state-action',
          type: 'button',
          onClick: () => ctx.loadTrailers(false, { activateFirst: true })
        }, createScrollerIcon('retry'), 'Erneut versuchen')
      )
    );
  };

  ctx.showEmptyState = () => {
    ctx.track.replaceChildren(
      createElement('div', { className: 'trailer-feed-state trailer-empty-state' },
        createScrollerIcon('film', 'trailer-feed-state-icon'),
        createElement('p', { className: 'trailer-feed-state-title' }, 'Keine Trailer gefunden'),
        createElement('p', { className: 'trailer-feed-state-text' },
          'In deiner Jellyfin-Bibliothek sind aktuell keine abspielbaren YouTube-Trailer hinterlegt.'
        ),
        createElement('button', {
          className: 'trailer-feed-state-action',
          type: 'button',
          onClick: () => ctx.loadTrailers(true, { activateFirst: true })
        }, createScrollerIcon('retry'), 'Bibliothek erneut prüfen')
      )
    );
    ctx.updateChrome();
  };

  function createSlide(trailer, index) {
    const containerId = ctx.getContainerId(index);
    const titleId = `trailer-title-${ctx.instanceId}-${index}`;

    const playerTarget = createElement('div', {
      className: 'trailer-youtube-player',
      id: containerId
    });

    const thumbnail = createElement('img', {
      className: 'trailer-video-thumb',
      src: `https://img.youtube.com/vi/${trailer.youtubeVideoId}/hqdefault.jpg`,
      alt: '',
      'aria-hidden': 'true',
      loading: 'lazy'
    });

    const videoContainer = createElement('div', { className: 'trailer-video-container' },
      playerTarget,
      thumbnail
    );

    const likeButton = createElement('button', {
      className: `trailer-action trailer-action-like${trailer.isFavorite ? ' is-favorite' : ''}`,
      type: 'button',
      'aria-label': trailer.isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen',
      'aria-pressed': String(Boolean(trailer.isFavorite)),
      onClick: () => ctx.toggleFavorite(trailer.itemId)
    },
      createScrollerIcon('favorite', 'trailer-action-icon'),
      createElement('span', { className: 'trailer-action-label' }, trailer.isFavorite ? 'Gespeichert' : 'Favorit')
    );

    const detailButton = createElement('button', {
      className: 'trailer-action trailer-action-detail',
      type: 'button',
      'aria-label': 'Detailseite öffnen',
      onClick: () => {
        ctx.navigateToDetail(trailer);
      }
    },
      createScrollerIcon('details', 'trailer-action-icon'),
      createElement('span', { className: 'trailer-action-label' }, 'Details')
    );

    const shareButton = createElement('button', {
      className: 'trailer-action trailer-action-share',
      type: 'button',
      'aria-label': 'Trailer teilen',
      onClick: () => ctx.openShareModal(trailer)
    },
      createScrollerIcon('share', 'trailer-action-icon'),
      createElement('span', { className: 'trailer-action-label' }, 'Teilen')
    );

    const actions = createElement('div', { className: 'trailer-actions' }, likeButton, detailButton, shareButton);

    const meta = createElement('div', { className: 'trailer-info-meta' });
    if (trailer.year) {
      meta.appendChild(createElement('span', { className: 'trailer-meta-chip' }, String(trailer.year)));
    }
    if (trailer.typeLabel || trailer.itemType) {
      meta.appendChild(createElement('span', { className: 'trailer-meta-chip trailer-meta-type' },
        trailer.typeLabel || (trailer.itemType === 'Movie' ? 'Film' : 'Serie')
      ));
    }
    if (trailer.fsk) {
      meta.appendChild(createElement('span', { className: 'trailer-meta-chip trailer-info-fsk' }, trailer.fsk));
    }
    if (trailer.rating) {
      meta.appendChild(createElement('span', { className: 'trailer-meta-chip trailer-info-rating' }, `★ ${Number(trailer.rating).toFixed(1)}`));
    }

    const title = createElement('h2', { className: 'trailer-info-title', id: titleId }, trailer.title);
    const isExpanded = ctx.expandedOverviewIds.has(trailer.itemId);
    const hasLongOverview = (trailer.overview || '').length > 180;
    const overview = createElement('p', {
      className: `trailer-info-overview${isExpanded ? ' is-expanded' : ''}`
    }, trailer.overview);
    const overviewToggle = hasLongOverview
      ? createElement('button', {
        className: 'trailer-overview-toggle',
        type: 'button',
        onClick: () => ctx.toggleOverview(trailer.itemId)
      }, isExpanded ? 'Weniger zeigen' : 'Mehr lesen')
      : null;

    const playerStatus = createElement('div', {
      className: 'trailer-player-status',
      role: 'status',
      'aria-live': 'polite'
    },
      createElement('span', { className: 'trailer-player-status-dot', 'aria-hidden': 'true' }),
      createElement('span', { className: 'trailer-player-status-text' }, 'YouTube-Player wird vorbereitet'),
      createElement('button', {
        className: 'trailer-player-skip',
        type: 'button',
        onClick: () => ctx.navigateRelative(1)
      }, 'Nächster Trailer')
    );

    const info = createElement('div', { className: 'trailer-info' },
      playerStatus,
      meta,
      title,
      overview,
      overviewToggle,
      actions
    );
    const card = createElement('article', { className: 'trailer-card', 'aria-labelledby': titleId }, videoContainer, info);

    const slide = createElement('div', {
      className: 'trailer-slide',
      'data-index': index,
      'data-id': trailer.id
    }, card);

    return slide;
  }

  ctx.renderSlides = () => {
    const existingSlides = Array.from(ctx.track.querySelectorAll('.trailer-slide'));
    const existingCount = existingSlides.length;

    if (existingCount === 0 && ctx.state.trailers.length > 0) {
      ctx.track.replaceChildren();
    }

    ctx.state.trailers.slice(existingCount).forEach((trailer, offset) => {
      const index = existingCount + offset;
      const slide = createSlide(trailer, index);
      ctx.track.appendChild(slide);
      if (ctx.intersectionObserver) {
        ctx.intersectionObserver.observe(slide);
      }
    });

    existingSlides.forEach((slide, index) => {
      const trailer = ctx.state.trailers[index];
      if (!trailer) return;
      const likeButton = slide.querySelector('.trailer-action-like');
      if (likeButton) {
        likeButton.classList.toggle('is-favorite', trailer.isFavorite);
        likeButton.setAttribute('aria-label', trailer.isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen');
        likeButton.setAttribute('aria-pressed', String(Boolean(trailer.isFavorite)));
        const likeLabel = likeButton.querySelector('.trailer-action-label');
        if (likeLabel) likeLabel.textContent = trailer.isFavorite ? 'Gespeichert' : 'Favorit';
      }

      const overview = slide.querySelector('.trailer-info-overview');
      if (overview) {
        overview.classList.toggle('is-expanded', ctx.expandedOverviewIds.has(trailer.itemId));
      }
      const overviewToggle = slide.querySelector('.trailer-overview-toggle');
      if (overviewToggle) {
        overviewToggle.textContent = ctx.expandedOverviewIds.has(trailer.itemId) ? 'Weniger zeigen' : 'Mehr lesen';
      }
    });

    ctx.updateChrome();
  };

  ctx.updateActiveClasses = () => {
    const slides = Array.from(ctx.track.children);
    slides.forEach((slide, index) => {
      slide.classList.toggle('is-active', index === ctx.state.activeIndex);
      slide.classList.toggle('is-prev', index === ctx.state.activeIndex - 1);
      slide.classList.toggle('is-next', index === ctx.state.activeIndex + 1);
    });
  };

  ctx.setPlayerStatus = (slide, status) => {
    if (!slide) return;

    slide.classList.toggle('is-player-ready', status === 'ready');
    slide.classList.toggle('has-player-error', status === 'error');

    const statusText = slide.querySelector('.trailer-player-status-text');
    if (!statusText) return;

    if (status === 'ready') {
      statusText.textContent = '';
    } else if (status === 'error') {
      statusText.textContent = 'Dieser YouTube-Trailer ist nicht verfügbar';
    } else {
      statusText.textContent = 'YouTube-Player wird vorbereitet';
    }
  };

  return ctx;
}
