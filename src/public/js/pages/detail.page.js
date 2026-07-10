import { createElement } from '../utils/dom.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { MediaApi } from '../api/media.api.js';
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

let detailFavoriteCheckboxCounter = 0;

const HEART_CONTAINER_MARKUP = `
  <div class="svg-container">
    <svg xmlns="http://www.w3.org/2000/svg" class="svg-outline" viewBox="0 0 24 24">
      <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z"></path>
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" class="svg-filled" viewBox="0 0 24 24">
      <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z"></path>
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" height="100" width="100" class="svg-celebrate">
      <polygon points="10,10 20,20"></polygon>
      <polygon points="10,50 20,50"></polygon>
      <polygon points="20,80 30,70"></polygon>
      <polygon points="90,10 80,20"></polygon>
      <polygon points="90,50 80,50"></polygon>
      <polygon points="80,80 70,70"></polygon>
    </svg>
  </div>
`;

function createFavoriteButton(item) {
  if (item.Type !== 'Movie' && item.Type !== 'Series') return null;

  const checkboxId = `detail-favorite-checkbox-${++detailFavoriteCheckboxCounter}`;

  const container = createElement('div', { title: 'Like', className: 'heart-container' });
  const checkbox = createElement('input', { id: checkboxId, className: 'checkbox', type: 'checkbox' });
  container.appendChild(checkbox);
  container.insertAdjacentHTML('beforeend', HEART_CONTAINER_MARKUP);

  checkbox.checked = item.UserData?.IsFavorite === true;

  let pending = false;

  checkbox.addEventListener('change', async () => {
    if (pending) return;

    pending = true;
    const nextIsFavorite = checkbox.checked;

    try {
      if (nextIsFavorite) {
        await MediaApi.favoriteItem(item.Id);
        appStore.showToast('Zu Favoriten hinzugefügt', 'success');
      } else {
        await MediaApi.unfavoriteItem(item.Id);
        appStore.showToast('Aus Favoriten entfernt', 'success');
      }
    } catch (error) {
      console.error('[Detail Favorite Error]', error);
      checkbox.checked = !nextIsFavorite;
      appStore.showToast('Favorit konnte nicht aktualisiert werden', 'error');
    } finally {
      pending = false;
    }
  });

  return container;
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
    container.innerHTML = '';
    setSectionBusy(container, true);
    container.appendChild(createSectionLoader({ label: 'Details werden geladen' }));

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

      const favoriteButton = createFavoriteButton(item);

      const detailView = DetailView({
        item: normalized,
        actions,
        favoriteButton,
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
      setSectionBusy(container, false);
    }
  };

  render();

  return container;
}
