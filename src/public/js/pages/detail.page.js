// Detail page of a film or series: play actions, favourite, watchlist, cast,
// seasons and similar titles.
import { createElement } from '../utils/dom.js';
import { createPlayedToggle } from '../components/playedToggle.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { MediaApi } from '../api/media.api.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { CastCarousel } from '../components/castCarousel.js';
import { DetailView } from '../components/detailView.js';
import { createActorModal } from './detail/actorModal.js';
import { buildSeasonsSection } from './detail/seasonsSection.js';
import { loadDetailData } from './detail/detailData.js';
import { buildHelpLinks } from './detail/helpLinks.js';
import { resolvePageScope } from '../utils/pageScope.js';
import { ErrorState } from '../components/emptyState.js';
import { createWatchlistButton } from '../components/watchlistButton.js';
import { extractYouTubeVideoId, openTrailerModal } from '../components/trailerModal.js';

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

  // The heart is Jellyfin's favourite (it also shows in other Jellyfin apps),
  // not "Meine Liste" next to it: its name says so.
  const container = createElement('div', { title: 'Favorit (auch in Jellyfin)', className: 'heart-container' });
  const checkbox = createElement('input', { id: checkboxId, className: 'checkbox', type: 'checkbox', 'aria-label': 'Favorit (auch in Jellyfin)' });
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

export default function DetailPage({ id }, pageScope) {
  const scope = resolvePageScope(pageScope);
  const { signal } = scope;
  const container = createElement('div', { className: 'page-container' });
  container.dataset.edgeTop = 'true';
  const actorModal = createActorModal({ currentItemId: id });

  const render = async () => {
    container.innerHTML = '';
    setSectionBusy(container, true);
    container.appendChild(createSectionLoader({ label: 'Details werden geladen' }));

    try {
      const { item, similar, seasons, normalized } = await loadDetailData(id, { signal });
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

      // A started film or episode continues; "Von vorn" starts it over.
      const started = item.Type !== 'Series' && Number(item.UserData?.PlaybackPositionTicks) > 0 && item.UserData?.Played !== true;
      const actions = [
        {
          label: started ? 'Fortsetzen' : 'Abspielen',
          className: 'btn-primary',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;"><path d="M8 5v14l11-7z"/></svg>',
          onClick: () => { window.location.hash = `#/player/${item.Id}`; }
        },
        started ? {
          label: 'Von vorn',
          className: 'btn-secondary',
          onClick: () => { window.location.hash = `#/player/${item.Id}?from=start`; }
        } : null,
        youtubeTrailerId ? {
          label: 'Trailer',
          className: 'btn-secondary',
          onClick: () => openTrailerModal({ title: `${normalized.name} Trailer`, videoId: youtubeTrailerId })
        } : null
      ].filter(Boolean);

      const favoriteButton = createFavoriteButton(item);
      const watchlistButton = createWatchlistButton(item, { scope });
      // A film or a whole series; its episodes follow (seasons section), and
      // single episodes are marked on their cards.
      const playedButton = item.Type === 'Movie' || item.Type === 'Series' ? createPlayedToggle(item, { withLabel: true }) : null;

      const detailView = DetailView({
        item: normalized,
        actions,
        favoriteButton,
        watchlistButton,
        playedButton,
        castSection,
        seasonsSection,
        similarSection,
        helpLinks: buildHelpLinks(item)
      });

      container.innerHTML = '';
      while (detailView.firstChild) {
        container.appendChild(detailView.firstChild);
      }

    } catch (error) {
      if (error.isAuthError) return;

      // An unknown or not shared title is no failure worth a toast.
      const notFound = error.status === 404;
      if (!notFound) {
        console.error('[Detail Page Load Error]', error);
        appStore.showToast('Fehler beim Laden der Details', 'error');
      }
      container.innerHTML = '';
      container.appendChild(
        createElement('div', { className: `content-section${notFound ? ' detail-not-found' : ''}` },
          ErrorState({
            title: notFound ? 'Dieser Titel ist nicht verfügbar' : undefined,
            message: notFound
              ? 'Es gibt ihn nicht (mehr), oder er ist für dich nicht freigegeben.'
              : error.message || 'Die Details konnten nicht abgerufen werden.',
            action: { label: 'Zurück zur Startseite', onClick: () => { window.location.hash = '#/home'; } }
          })
        )
      );
    } finally {
      setSectionBusy(container, false);
    }
  };

  render();

  return container;
}
