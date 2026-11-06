// Detail page of a film or series: play actions, favourite, watchlist, cast,
// seasons and similar titles.
import { createElement } from '../utils/dom.js';
import { createPlayedToggle } from '../components/playedToggle.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { MediaApi } from '../api/media.api.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { CastCrewSection } from '../components/castCrewSection.js';
import { DetailView } from '../components/detailView.js';
import { createActorModal } from './detail/actorModal.js';
import { buildSeasonsSection } from './detail/seasonsSection.js';
import { loadDetailData } from './detail/detailData.js';
import { buildHelpLinks } from './detail/helpLinks.js';
import { buildChips, buildVersionPicker } from './detail/heroFacts.js';
import { createHeroTrailer } from './detail/heroTrailer.js';
import { trailerVideoIdOf } from '../components/backgroundTrailer.js';
import { loadCollectionSection, loadExtrasSection } from './detail/moreSections.js';
import { whenCoverColors, rgbText } from '../utils/coverColors.js';
import { formatEpisodeCode } from '../shared/episodeCode.js';
import { resolvePageScope } from '../utils/pageScope.js';
import { ErrorState } from '../components/emptyState.js';
import { createWatchlistButton } from '../components/watchlistButton.js';
import { openTrailerModal } from '../components/trailerModal.js';

// The hero's glow takes the poster's colours (see coverColors.js).
function tintHero(hero, posterUrl) {
  if (!posterUrl || !hero) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = posterUrl;
  whenCoverColors(img).then(colors => {
    if (!colors) return;
    hero.style.setProperty('--detail-tint-a', rgbText(colors.primary));
    hero.style.setProperty('--detail-tint-b', rgbText(colors.secondary));
    hero.classList.add('has-tint');
  });
}

// A series plays on where the user left it: the button says which episode.
function labelSeriesPlay(view, item, { signal }) {
  const button = view.querySelector('[data-tv-key="detail-play"]');
  MediaApi.getNextUp(item.Id).then(({ episode }) => {
    if (!episode || signal?.aborted || !button?.isConnected) return;
    const code = formatEpisodeCode(episode);
    const begun = Number(episode.UserData?.PlaybackPositionTicks) > 0;
    const label = button.lastChild?.nodeType === Node.TEXT_NODE ? button.lastChild : null;
    if (label) label.textContent = `${code} ${begun ? 'fortsetzen' : 'abspielen'}`;
    button.appendChild(createElement('span', { className: 'detail-action-note' }, episode.Name || ''));
  }).catch(() => {});
}

// A row that loads after the hero replaces its slot, or the slot goes.
function fillLateSlot(slot, promise) {
  promise.then(section => {
    if (!slot.isConnected && !slot.parentNode) return;
    const holder = slot.closest('.detail-extra-section') || slot;
    if (section) slot.replaceWith(section);
    else holder.remove();
  }).catch(() => (slot.closest('.detail-extra-section') || slot).remove());
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
      // A title in several libraries has one page: that of its first copy.
      const firstCopyId = item.VantaCopies?.[0]?.Id;
      if (firstCopyId && firstCopyId !== id) {
        window.location.replace(`#/item/${firstCopyId}`);
        return;
      }
      const youtubeTrailerId = trailerVideoIdOf(item);
      const openPerson = (person) => actorModal.openActorModal(person);

      const seasonsSection = item.Type === 'Series' && seasons && seasons.length > 0
        ? buildSeasonsSection(item, seasons)
        : null;
      const castSection = CastCrewSection({ crew: normalized.crew || [], actors: normalized.actors || [], onSelect: openPerson });
      const similarSection = similar && similar.length > 0
        ? MediaCarousel({ title: 'Ähnliche Titel', items: similar, landscape: false })
        : null;
      // Filled once they have loaded: the film series and the extras.
      const collectionSlot = createElement('div', { className: 'detail-late-slot' });
      const extrasSlot = createElement('div', { className: 'detail-late-slot' });

      // The version a film plays in (a film held twice); the play buttons follow it.
      let playId = item.Id;
      const versionPicker = buildVersionPicker(item, { onChange: (versionId) => { playId = versionId; } });

      // A started film continues; "Von vorn" starts it over. A series names
      // the episode it continues with once that is known.
      const started = item.Type !== 'Series' && Number(item.UserData?.PlaybackPositionTicks) > 0 && item.UserData?.Played !== true;
      const progress = started && item.RunTimeTicks ? Number(item.UserData.PlaybackPositionTicks) / Number(item.RunTimeTicks) : 0;
      const leftMinutes = started && Number(item.RunTimeTicks) > 0 ? Math.max(1, Math.round((Number(item.RunTimeTicks) - Number(item.UserData.PlaybackPositionTicks)) / 600_000_000)) : null;
      const actions = [
        {
          label: started ? 'Fortsetzen' : 'Abspielen',
          className: 'btn-primary detail-play',
          icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;"><path d="M8 5v14l11-7z"/></svg>',
          note: leftMinutes ? `noch ${leftMinutes} Min.` : null,
          progress,
          onClick: () => { window.location.hash = `#/player/${playId}`; }
        },
        started ? {
          label: 'Von vorn',
          className: 'btn-secondary',
          onClick: () => { window.location.hash = `#/player/${playId}?from=start`; }
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

      const heroControls = createElement('div', { className: 'detail-hero-controls' });
      const detailView = DetailView({
        item: normalized,
        actions,
        favoriteButton,
        watchlistButton,
        playedButton,
        chips: buildChips(item, normalized),
        versionPicker,
        heroControls,
        helpLinks: buildHelpLinks(item),
        sections: [seasonsSection, castSection, collectionSlot, extrasSlot, similarSection]
      });

      const hero = detailView.querySelector('.detail-page');
      tintHero(hero, normalized.posterUrl);
      const trailer = createHeroTrailer({ videoId: youtubeTrailerId, scope, hero });
      if (trailer) {
        hero.insertBefore(trailer.layer, hero.querySelector('.detail-hero-glow'));
        heroControls.appendChild(trailer.soundButton);
      }
      if (item.Type === 'Series') labelSeriesPlay(detailView, item, { signal });
      fillLateSlot(collectionSlot, loadCollectionSection(item, { signal }));
      fillLateSlot(extrasSlot, loadExtrasSection(item, normalized.name, { signal }));

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
