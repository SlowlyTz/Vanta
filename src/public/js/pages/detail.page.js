import { createElement } from '../utils/dom.js';
import { appStore } from '../store/app.store.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { CastCarousel } from '../components/castCarousel.js';
import { DetailView } from '../components/detailView.js';
import { createActorModal } from './detail/actorModal.js';
import { buildSeasonsSection } from './detail/seasonsSection.js';
import { loadDetailData } from './detail/detailData.js';
import { YouTubePlayerManager } from './trailer-scroller/player.js';

let detailTrailerModalCounter = 0;

function getReturnToHash() {
  const [, query = ''] = (window.location.hash || '').split('?');
  const returnTo = new URLSearchParams(query).get('returnTo');
  if (!returnTo || !returnTo.startsWith('#/')) return null;
  return returnTo;
}

function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'youtu.be' || host === 'www.youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }

    if (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'www.youtube-nocookie.com'
    ) {
      const v = parsed.searchParams.get('v');
      if (v) return v;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'embed' || pathParts[0] === 'shorts') {
        return pathParts[1] || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getYouTubeTrailerId(item) {
  const remoteTrailer = Array.isArray(item.RemoteTrailers)
    ? item.RemoteTrailers.find((trailer) => extractYouTubeVideoId(trailer?.Url))
    : null;
  if (remoteTrailer) return extractYouTubeVideoId(remoteTrailer.Url);

  const externalTrailer = Array.isArray(item.ExternalUrls)
    ? item.ExternalUrls.find((entry) => extractYouTubeVideoId(entry?.Url))
    : null;
  if (externalTrailer) return extractYouTubeVideoId(externalTrailer.Url);

  return extractYouTubeVideoId(item.TrailerUrl);
}

function openTrailerModal({ title, videoId }) {
  const modalId = `detail-trailer-player-${++detailTrailerModalCounter}`;
  const playerManager = new YouTubePlayerManager();

  const playerTarget = createElement('div', {
    className: 'detail-trailer-player',
    id: modalId
  });

  const closeModal = () => {
    playerManager.destroyAll();
    modal.remove();
    document.removeEventListener('keydown', handleKeydown);
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  };

  const modal = createElement('div', {
    className: 'detail-trailer-backdrop',
    onClick: (event) => {
      if (event.target === modal) closeModal();
    }
  },
    createElement('div', {
      className: 'detail-trailer-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'detail-trailer-title'
    },
      createElement('button', {
        className: 'detail-trailer-close',
        type: 'button',
        'aria-label': 'Trailer schließen',
        onClick: closeModal
      }, '×'),
      createElement('h2', { className: 'detail-trailer-title', id: 'detail-trailer-title' }, title),
      createElement('div', { className: 'detail-trailer-frame' }, playerTarget)
    )
  );

  document.body.appendChild(modal);
  document.addEventListener('keydown', handleKeydown);

  playerManager.createPlayer(modalId, videoId, {
    autoplay: 1,
    muted: false
  });
}

export default function DetailPage({ id }) {
  const container = createElement('div', { className: 'page-container' });
  const actorModal = createActorModal({ currentItemId: id });
  const returnToHash = getReturnToHash();

  const render = async () => {
    appStore.setLoading(true);
    try {
      const { item, similar, seasons, normalized } = await loadDetailData(id);
      const youtubeTrailerId = getYouTubeTrailerId(item);

      const actors = normalized.actors || [];
      const castSection = actors.length > 0
        ? CastCarousel({ actors, onActorClick: (actor) => actorModal.openActorModal(actor) })
        : null;

      const seasonsSection = item.Type === 'Series' && seasons && seasons.length > 0
        ? buildSeasonsSection(item, seasons)
        : null;

      const similarSection = similar && similar.length > 0
        ? MediaCarousel({ title: 'Ähnliche Titel', items: similar, landscape: false })
        : null;

      const actions = [
        {
          label: 'Abspielen',
          className: 'btn-primary',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;"><path d="M8 5v14l11-7z"/></svg>',
          onClick: () => { window.location.hash = `#/player/${item.Id}`; }
        },
        youtubeTrailerId ? {
          label: 'Trailer',
          className: 'btn-secondary',
          onClick: () => openTrailerModal({ title: `${normalized.name} Trailer`, videoId: youtubeTrailerId })
        } : null,
        {
          label: 'Zurück',
          className: 'btn-secondary',
          onClick: () => {
            if (returnToHash) {
              window.location.hash = returnToHash;
              return;
            }
            window.history.back();
          }
        }
      ].filter(Boolean);

      const detailView = DetailView({
        item: normalized,
        actions,
        castSection,
        seasonsSection,
        similarSection
      });

      container.innerHTML = '';
      while (detailView.firstChild) {
        container.appendChild(detailView.firstChild);
      }

    } catch (error) {
      if (error.isAuthError) return;

      console.error('[Detail Page Load Error]', error);
      appStore.showToast('Fehler beim Laden der Details', 'error');
      container.innerHTML = '';
      container.appendChild(
        createElement('div', { className: 'content-section' },
          createElement('div', { className: 'search-empty-state' },
            createElement('h3', {}, 'Fehler beim Laden'),
            createElement('p', {}, error.message || 'Die Details konnten nicht abgerufen werden.'),
            createElement('button', {
              className: 'btn-primary',
              onClick: () => { window.location.hash = '#/home'; }
            }, 'Zurück zur Startseite')
          )
        )
      );
    } finally {
      appStore.setLoading(false);
    }
  };

  render();

  return container;
}
