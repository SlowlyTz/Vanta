import { createElement } from '../utils/dom.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { createPosterPlaceholder } from '../utils/poster.js';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export default function RequestDetailPage({ type, id }) {
  const container = createElement('div', { className: 'page-container' });

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
      const backdropUrl = backdropPath ? `${TMDB_IMAGE_BASE.replace('w500', 'w1280')}${backdropPath}` : null;
      const year = (details.release_date || details.first_air_date || '').substring(0, 4);
      const runtime = details.runtime ? `${details.runtime} min` : '';
      const rating = details.vote_average ? details.vote_average.toFixed(1) : '-';
      const mediaType = type === 'tv' ? 'Serie' : 'Film';
      const isBanned = Boolean(details.banned || crossCheck.banned);
      const isRequested = Boolean(details.requested) || await isAlreadyRequested(parseInt(id), type);

      if (backdropUrl) {
        const backdropWrapper = createElement('div', {
          className: 'detail-backdrop',
          style: `height: 300px; background: url(${backdropUrl}) center/cover no-repeat;`
        });
        container.appendChild(backdropWrapper);
      }

      const content = createElement('div', { className: 'content-section' });

      const mainRow = createElement('div', {
        className: 'detail-main',
        style: 'display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 32px;'
      });

      const posterWrap = createElement('div', {});
      const poster = createElement('img', {
        src: posterUrl || createPosterPlaceholder(title),
        alt: title,
        loading: 'lazy',
        style: 'width: 200px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);',
        onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.src = createPosterPlaceholder(title); }
      });
      posterWrap.appendChild(poster);
      mainRow.appendChild(posterWrap);

      const info = createElement('div', { style: 'flex: 1; min-width: 250px;' });
      info.appendChild(createElement('h2', null, title));
      const meta = createElement('div', { style: 'display: flex; gap: 12px; margin-bottom: 16px; color: #999;' });
      meta.appendChild(createElement('span', null, `${year}`));
      meta.appendChild(createElement('span', null, `${mediaType}`));
      if (runtime) meta.appendChild(createElement('span', null, runtime));
      info.appendChild(meta);

      if (details.overview) {
        info.appendChild(createElement('p', { style: 'color: #ccc; line-height: 1.6;' }, details.overview));
      }

      if (crossCheck.exists) {
        const badge = createElement('div', {
          style: 'display: inline-block; padding: 6px 12px; background: rgba(34,197,94,0.15); color: #22c55e; border-radius: 6px; margin-top: 12px; font-size: 0.85rem;'
        }, 'Bereits in der Mediathek verfuegbar');
        info.appendChild(badge);

        if (type === 'tv' && crossCheck.seasons && crossCheck.seasons.length > 0) {
          const seasonList = createElement('div', { style: 'margin-top: 8px; font-size: 0.85rem;' });
          crossCheck.seasons.forEach(s => {
            seasonList.appendChild(createElement('div', {
              style: `color: ${s.exists ? '#22c55e' : '#ef4444'};`,
            }, `${s.name} ${s.exists ? '(vorhanden)' : '(nicht vorhanden)'}`));
          });
          info.appendChild(seasonList);
        }
      }

      if (isBanned) {
        const rejectedBadge = createElement('div', {
          style: 'display: inline-block; padding: 6px 12px; background: rgba(239,68,68,0.15); color: #ef4444; border-radius: 6px; margin-top: 12px; font-size: 0.85rem;'
        }, 'Diese Anfrage wurde abgelehnt und kann nicht erneut gestellt werden');
        info.appendChild(rejectedBadge);
      }

      mainRow.appendChild(info);
      content.appendChild(mainRow);

      if (details.cast && details.cast.length > 0) {
        const castSection = createElement('div', { className: 'detail-cast' });
        castSection.appendChild(createElement('h3', { className: 'cast-title' }, 'Besetzung'));
        const castGrid = createElement('div', {
          style: 'display: flex; gap: 12px; flex-wrap: wrap;'
        });
        details.cast.forEach(actor => {
          const actorItem = createElement('div', {
            style: 'text-align: center;'
          });
          if (actor.profile_path) {
            const img = createElement('img', {
              src: `https://image.tmdb.org/t/p/w185${actor.profile_path}`,
              alt: actor.name,
              loading: 'lazy',
              style: 'width: 80px; height: 80px; border-radius: 50%; object-fit: cover;',
              onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }
            });
            actorItem.appendChild(img);
          }
          actorItem.appendChild(createElement('div', { style: 'font-size: 0.85rem; margin-top: 4px;' }, actor.name));
          if (actor.character) {
            actorItem.appendChild(createElement('div', { style: 'font-size: 0.75rem; color: #888;' }, actor.character));
          }
          castGrid.appendChild(actorItem);
        });
        castSection.appendChild(castGrid);
        content.appendChild(castSection);
      }

      if (type === 'tv' && details.seasons && details.seasons.length > 0) {
        const seasonsGrid = createElement('div', { style: 'margin-top: 24px;' });
        seasonsGrid.appendChild(createElement('h3', { className: 'cast-title' }, 'Staffel'));
        const grid = createElement('div', { style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 12px;' });
        (details.seasons || []).filter(s => s.season_number >= 0).forEach(season => {
          const seasonCard = createElement('div', {
            style: 'border-radius: 8px; padding: 8px; background: rgba(255,255,255,0.05);'
          });
          if (season.poster_path) {
            seasonCard.appendChild(createElement('img', {
              src: `${TMDB_IMAGE_BASE}${season.poster_path}`,
              alt: season.name,
              loading: 'lazy',
              style: 'width: 100%; border-radius: 6px;',
              onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }
            }));
          }
          seasonCard.appendChild(createElement('div', { style: 'margin-top: 4px; font-size: 0.85rem;' }, season.name));
          seasonCard.appendChild(createElement('div', { style: 'font-size: 0.75rem; color: #888;' }, `${season.episode_count || 0} Folgen`));
          grid.appendChild(seasonCard);
        });
        seasonsGrid.appendChild(grid);
        content.appendChild(seasonsGrid);
      }

      const actions = createElement('div', { style: 'display: flex; gap: 12px; margin-top: 24px;' });

      let requestBtnNote;

      if (!isRequested && !crossCheck.exists && !isBanned) {
        const requestBtn = createElement('button', {
          className: 'btn-primary',
          onClick: async () => {
            requestBtn.disabled = true;
            requestBtn.textContent = 'Wird angefragt...';
            try {
              await RequestsApi.createRequest(parseInt(id), type, requestBtnNote?.value || '');
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
        actions.appendChild(requestBtn);

        requestBtnNote = createElement('input', {
          type: 'text',
          placeholder: 'Notiz (optional)',
          className: 'search-input-field',
          style: 'flex: 1; min-width: 200px;'
        });
        actions.appendChild(requestBtnNote);
      } else if (isRequested) {
        actions.appendChild(createElement('span', { className: 'btn-requested', style: 'cursor: default;' }, 'Bereits angefragt'));
      } else if (crossCheck.exists) {
        actions.appendChild(createElement('span', { className: 'btn-requested', style: 'cursor: default;' }, 'In Mediathek'));
      } else if (isBanned) {
        actions.appendChild(createElement('span', { className: 'btn-request-error', style: 'cursor: default;' }, 'Abgelehnt'));
      }

      const backBtn = createElement('button', {
        className: 'btn-secondary',
        onClick: () => { window.history.back(); }
      }, 'Zurueck');
      actions.appendChild(backBtn);

      content.appendChild(actions);
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
