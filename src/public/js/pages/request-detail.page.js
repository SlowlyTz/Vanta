import { createElement } from '../utils/dom.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { DetailView } from '../components/detailView.js';
import { openTrailerModal } from '../components/trailerModal.js';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const TMDB_PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';

function normalizeRequestDetail(details, type) {
  const title = details.title || details.name || 'Unbekannt';
  const year = (details.release_date || details.first_air_date || '').slice(0, 4);

  return {
    id: details.id,
    name: title,
    originalTitle: details.original_title || details.original_name || null,
    typeLabel: type === 'tv' ? 'Serie' : 'Film',
    year: year || null,
    duration: details.runtime ? `${details.runtime} min` : null,
    rating: details.vote_average || null,
    tagline: details.tagline || null,
    overview: details.overview || 'Keine Beschreibung verfügbar.',
    genres: (details.genres || []).map(genre => genre.name).filter(Boolean),
    posterUrl: details.poster_path ? `${TMDB_IMAGE_BASE}${details.poster_path}` : null,
    backdropUrl: details.backdrop_path ? `${TMDB_BACKDROP_BASE}${details.backdrop_path}` : null
  };
}

function buildStatusContent({ crossCheck, isBanned, isRequested, type }) {
  const badges = createElement('div', { className: 'request-detail-badges' });

  if (crossCheck.exists) {
    badges.appendChild(createElement('span', { className: 'request-detail-badge badge-available' }, 'In Mediathek verfügbar'));
  }

  if (isBanned) {
    badges.appendChild(createElement('span', { className: 'request-detail-badge badge-banned' }, 'Abgelehnt'));
  } else if (isRequested) {
    badges.appendChild(createElement('span', { className: 'request-detail-badge badge-requested' }, 'Bereits angefragt'));
  }

  const nodes = [];
  if (badges.children.length > 0) nodes.push(badges);

  if (crossCheck.exists && type === 'tv' && crossCheck.seasons && crossCheck.seasons.length > 0) {
    const seasonList = createElement('div', { className: 'request-detail-seasons' });
    crossCheck.seasons.forEach(s => {
      seasonList.appendChild(createElement('div', {
        className: `request-detail-season${s.exists ? ' season-available' : ' season-missing'}`
      }, `${s.name} ${s.exists ? '(vorhanden)' : '(nicht vorhanden)'}`));
    });
    nodes.push(seasonList);
  }

  return nodes.length > 0 ? nodes : null;
}

function buildCastSection(cast) {
  if (!cast || cast.length === 0) return null;

  const section = createElement('div', { className: 'request-detail-cast' },
    createElement('h3', { className: 'request-detail-section-title' }, 'Besetzung')
  );
  const grid = createElement('div', { className: 'request-detail-cast-grid' });

  cast.forEach(actor => {
    const item = createElement('div', { className: 'request-detail-cast-item' });
    if (actor.profile_path) {
      item.appendChild(createElement('img', {
        src: `${TMDB_PROFILE_BASE}${actor.profile_path}`,
        alt: actor.name,
        loading: 'lazy',
        onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }
      }));
    }
    item.appendChild(createElement('div', { className: 'request-detail-cast-name' }, actor.name));
    if (actor.character) {
      item.appendChild(createElement('div', { className: 'request-detail-cast-role' }, actor.character));
    }
    grid.appendChild(item);
  });

  section.appendChild(grid);
  return section;
}

function buildSeasonsSection(seasons) {
  const relevant = (seasons || []).filter(s => s.season_number >= 0);
  if (relevant.length === 0) return null;

  const section = createElement('div', { className: 'request-detail-seasons-section' },
    createElement('h3', { className: 'request-detail-section-title' }, 'Staffeln')
  );
  const grid = createElement('div', { className: 'request-detail-seasons-grid' });

  relevant.forEach(season => {
    const card = createElement('div', { className: 'request-detail-season-card' });
    if (season.poster_path) {
      card.appendChild(createElement('img', {
        src: `${TMDB_IMAGE_BASE}${season.poster_path}`,
        alt: season.name,
        loading: 'lazy',
        onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }
      }));
    }
    card.appendChild(createElement('div', { className: 'request-detail-season-name' }, season.name));
    card.appendChild(createElement('div', { className: 'request-detail-season-episodes' }, `${season.episode_count || 0} Folgen`));
    grid.appendChild(card);
  });

  section.appendChild(grid);
  return section;
}

export default function RequestDetailPage({ type, id }) {
  const container = createElement('div', { className: 'page-container request-detail-page' });

  const isAlreadyRequested = async (tmdbId, tmdbType) => {
    try {
      const requests = await RequestsApi.getMyRequests();
      return requests.some(r => r.tmdb_id === tmdbId && r.tmdb_type === tmdbType && r.status !== 'rejected');
    } catch {
      return false;
    }
  };

  const loadDetails = async () => {
    container.innerHTML = '';
    setSectionBusy(container, true);
    container.appendChild(createSectionLoader({ label: 'Details werden geladen' }));

    try {
      const [details, crossCheck] = await Promise.all([
        RequestsApi.getDetails(parseInt(id), type),
        RequestsApi.crossCheck(parseInt(id), type).catch(() => ({ exists: false, seasons: [] }))
      ]);

      const normalized = normalizeRequestDetail(details, type);
      const isBanned = Boolean(details.banned || crossCheck.banned);
      const isRequested = Boolean(details.requested) || await isAlreadyRequested(parseInt(id), type);
      const canRequest = !isRequested && !crossCheck.exists && !isBanned;

      const handleRequest = async (event) => {
        const btn = event.currentTarget;
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.textContent = 'Wird angefragt...';
        try {
          await RequestsApi.createRequest(parseInt(id), type, '');
          btn.textContent = 'Angefragt';
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-requested');
          btn.disabled = true;
          btn.removeAttribute('aria-busy');
          appStore.showToast('Anfrage erfolgreich!', 'success');
        } catch (error) {
          btn.disabled = false;
          btn.removeAttribute('aria-busy');
          btn.textContent = 'Anfragen';
          appStore.showToast(error.message || 'Fehler beim Anfrage', 'error');
        }
      };

      const trailerAction = details.trailer && details.trailer.site === 'YouTube' && details.trailer.key
        ? {
            label: 'Trailer',
            className: 'btn-secondary',
            onClick: () => openTrailerModal({ title: `${normalized.name} Trailer`, videoId: details.trailer.key })
          }
        : null;

      const actions = [
        canRequest ? {
          label: 'Anfragen',
          className: 'btn-primary',
          onClick: handleRequest
        } : null,
        trailerAction,
        {
          label: 'Zurück',
          className: 'btn-secondary',
          onClick: () => { window.history.back(); }
        }
      ].filter(Boolean);

      const statusContent = buildStatusContent({ crossCheck, isBanned, isRequested, type });
      const castSection = buildCastSection(details.cast);
      const seasonsSection = type === 'tv' ? buildSeasonsSection(details.seasons) : null;

      const detailView = DetailView({
        item: normalized,
        actions,
        castSection,
        seasonsSection,
        statusContent
      });

      container.innerHTML = '';
      while (detailView.firstChild) {
        container.appendChild(detailView.firstChild);
      }

    } catch (error) {
      if (error.isAuthError) return;

      console.error('[Request Detail Page Error]', error);
      appStore.showToast('Fehler beim Laden', 'error');
      container.innerHTML = '';
      container.appendChild(
        createElement('div', { className: 'content-section' },
          createElement('div', { className: 'search-empty-state' },
            createElement('h3', {}, 'Fehler beim Laden'),
            createElement('p', {}, error.message || 'Die Details konnten nicht abgerufen werden.'),
            createElement('button', {
              className: 'btn-primary',
              onClick: loadDetails
            }, 'Erneut versuchen')
          )
        )
      );
    } finally {
      setSectionBusy(container, false);
    }
  };

  loadDetails();

  return container;
}
