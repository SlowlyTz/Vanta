import { createElement } from '../utils/dom.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { createPosterPlaceholder } from '../utils/poster.js';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

export default function RequestDetailPage({ type, id }) {
  const container = createElement('div', { className: 'page-container request-detail-page' });

  const loadDetails = async () => {
    appStore.setLoading(true);
    try {
      const [details, crossCheck] = await Promise.all([
        RequestsApi.getDetails(parseInt(id), type),
        RequestsApi.crossCheck(parseInt(id), type).catch(() => ({ exists: false, seasons: [] }))
      ]);

      container.innerHTML = '';
      const title = details.title || details.name || 'Unbekannt';
      const posterPath = details.poster_path;
      const posterUrl = posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : null;
      const backdropPath = details.backdrop_path;
      const backdropUrl = backdropPath ? `${TMDB_BACKDROP_BASE}${backdropPath}` : null;
      const year = (details.release_date || details.first_air_date || '').substring(0, 4);
      const runtime = details.runtime ? `${details.runtime} min` : '';
      const rating = details.vote_average ? details.vote_average.toFixed(1) : null;
      const mediaType = type === 'tv' ? 'Serie' : 'Film';
      const isBanned = Boolean(details.banned || crossCheck.banned);
      const isRequested = Boolean(details.requested) || await isAlreadyRequested(parseInt(id), type);

      if (backdropUrl) {
        const backdropWrapper = createElement('div', {
          className: 'request-detail-backdrop',
          style: `background-image: url(${backdropUrl});`
        });
        container.appendChild(backdropWrapper);
      }

      const content = createElement('div', { className: 'content-section request-detail-content' });

      const mainRow = createElement('div', { className: 'request-detail-main' });

      const posterWrap = createElement('div', { className: 'request-detail-poster-wrap' },
        createElement('img', {
          className: 'request-detail-poster',
          src: posterUrl || createPosterPlaceholder(title),
          alt: title,
          loading: 'lazy',
          onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.src = createPosterPlaceholder(title); }
        })
      );

      const info = createElement('div', { className: 'request-detail-info' });
      const titleRow = createElement('div', { className: 'request-detail-title-row' });
      const actions = createElement('div', { className: 'request-detail-actions' });
      let requestBtn = null;

      titleRow.appendChild(createElement('h1', { className: 'request-detail-title' }, title));

      if (!isRequested && !crossCheck.exists && !isBanned) {
        requestBtn = createElement('button', {
          className: 'btn-primary request-detail-request-btn',
          onClick: async () => {
            requestBtn.disabled = true;
            requestBtn.textContent = 'Wird angefragt...';
            try {
              await RequestsApi.createRequest(parseInt(id), type, '');
              requestBtn.textContent = 'Angefragt';
              requestBtn.classList.remove('btn-primary');
              requestBtn.classList.add('btn-requested');
              requestBtn.disabled = true;
              appStore.showToast('Anfrage erfolgreich!', 'success');
            } catch (error) {
              requestBtn.disabled = false;
              requestBtn.textContent = 'Anfragen';
              appStore.showToast(error.message || 'Fehler beim Anfrage', 'error');
            }
          }
        }, 'Anfragen');

        titleRow.appendChild(requestBtn);
      }

      info.appendChild(titleRow);

      const meta = createElement('div', { className: 'request-detail-meta' });
      if (year) meta.appendChild(createElement('span', {}, year));
      meta.appendChild(createElement('span', {}, mediaType));
      if (runtime) meta.appendChild(createElement('span', {}, runtime));
      if (rating) meta.appendChild(createElement('span', { className: 'request-detail-rating' }, `★ ${rating}`));
      info.appendChild(meta);

      if (details.overview) {
        info.appendChild(createElement('p', { className: 'request-detail-overview' }, details.overview));
      }

      const badges = createElement('div', { className: 'request-detail-badges' });

      if (crossCheck.exists) {
        badges.appendChild(createElement('span', { className: 'request-detail-badge badge-available' }, 'In Mediathek verfügbar'));

        if (type === 'tv' && crossCheck.seasons && crossCheck.seasons.length > 0) {
          const seasonList = createElement('div', { className: 'request-detail-seasons' });
          crossCheck.seasons.forEach(s => {
            seasonList.appendChild(createElement('div', {
              className: `request-detail-season${s.exists ? ' season-available' : ' season-missing'}`
            }, `${s.name} ${s.exists ? '(vorhanden)' : '(nicht vorhanden)'}`));
          });
          info.appendChild(seasonList);
        }
      }

      if (isBanned) {
        badges.appendChild(createElement('span', { className: 'request-detail-badge badge-banned' }, 'Abgelehnt'));
      } else if (isRequested) {
        badges.appendChild(createElement('span', { className: 'request-detail-badge badge-requested' }, 'Bereits angefragt'));
      }

      if (badges.children.length > 0) {
        info.appendChild(badges);
      }

      const backBtn = createElement('button', {
        className: 'btn-secondary request-detail-back-btn',
        onClick: () => { window.history.back(); }
      }, 'Zurück');
      actions.appendChild(backBtn);

      if (actions.children.length > 0) {
        info.appendChild(actions);
      }

      mainRow.appendChild(posterWrap);
      mainRow.appendChild(info);
      content.appendChild(mainRow);

      if (details.cast && details.cast.length > 0) {
        const castSection = createElement('div', { className: 'request-detail-cast' });
        castSection.appendChild(createElement('h3', { className: 'request-detail-section-title' }, 'Besetzung'));
        const castGrid = createElement('div', { className: 'request-detail-cast-grid' });
        details.cast.forEach(actor => {
          const actorItem = createElement('div', { className: 'request-detail-cast-item' });
          if (actor.profile_path) {
            const img = createElement('img', {
              src: `https://image.tmdb.org/t/p/w185${actor.profile_path}`,
              alt: actor.name,
              loading: 'lazy',
              onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }
            });
            actorItem.appendChild(img);
          }
          actorItem.appendChild(createElement('div', { className: 'request-detail-cast-name' }, actor.name));
          if (actor.character) {
            actorItem.appendChild(createElement('div', { className: 'request-detail-cast-role' }, actor.character));
          }
          castGrid.appendChild(actorItem);
        });
        castSection.appendChild(castGrid);
        content.appendChild(castSection);
      }

      if (type === 'tv' && details.seasons && details.seasons.length > 0) {
        const seasonsSection = createElement('div', { className: 'request-detail-seasons-section' });
        seasonsSection.appendChild(createElement('h3', { className: 'request-detail-section-title' }, 'Staffeln'));
        const seasonsGrid = createElement('div', { className: 'request-detail-seasons-grid' });
        (details.seasons || []).filter(s => s.season_number >= 0).forEach(season => {
          const seasonCard = createElement('div', { className: 'request-detail-season-card' });
          if (season.poster_path) {
            seasonCard.appendChild(createElement('img', {
              src: `${TMDB_IMAGE_BASE}${season.poster_path}`,
              alt: season.name,
              loading: 'lazy',
              onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }
            }));
          }
          seasonCard.appendChild(createElement('div', { className: 'request-detail-season-name' }, season.name));
          seasonCard.appendChild(createElement('div', { className: 'request-detail-season-episodes' }, `${season.episode_count || 0} Folgen`));
          seasonsGrid.appendChild(seasonCard);
        });
        seasonsSection.appendChild(seasonsGrid);
        content.appendChild(seasonsSection);
      }

      container.appendChild(content);

    } catch (error) {
      if (error.isAuthError) return;

      console.error('[Detail Page Error]', error);
      appStore.showToast('Fehler beim Laden', 'error');
    } finally {
      appStore.setLoading(false);
    }
  };

  const isAlreadyRequested = async (tmdbId, tmdbType) => {
    try {
      const requests = await RequestsApi.getMyRequests();
      return requests.some(r => r.tmdb_id === tmdbId && r.tmdb_type === tmdbType && r.status !== 'rejected');
    } catch {
      return false;
    }
  };

  loadDetails();

  return container;
}
