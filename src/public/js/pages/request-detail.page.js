import { createElement } from '../utils/dom.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { DetailView } from '../components/detailView.js';
import { openTrailerModal } from '../components/trailerModal.js';
import { mergeSeasons, buildRequestCoverage } from './requests/helpers.js';
import { createRequestScopeSelector } from './requests/scopeSelector.js';
import { getTmdbImageUrl } from '../utils/poster.js';

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
    posterUrl: getTmdbImageUrl(details.poster_path),
    backdropUrl: getTmdbImageUrl(details.backdrop_path, 'w1280')
  };
}

// Series get their season availability from the scope selector below the hero,
// so the hero only carries the title-level badges.
function buildStatusContent({ crossCheck, isBanned, isRequested }) {
  const badges = createElement('div', { className: 'request-detail-badges' });

  if (crossCheck.exists) {
    badges.appendChild(createElement('span', { className: 'request-detail-badge badge-available' }, 'In Mediathek verfügbar'));
  }

  if (isBanned) {
    badges.appendChild(createElement('span', { className: 'request-detail-badge badge-banned' }, 'Abgelehnt'));
  } else if (isRequested) {
    badges.appendChild(createElement('span', { className: 'request-detail-badge badge-requested' }, 'Bereits angefragt'));
  }

  return badges.children.length > 0 ? [badges] : null;
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
        src: getTmdbImageUrl(actor.profile_path, 'w185'),
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

export default function RequestDetailPage({ type, id }) {
  const container = createElement('div', { className: 'page-container request-detail-page' });

  const tmdbId = parseInt(id, 10);

  const loadDetails = async () => {
    container.innerHTML = '';
    setSectionBusy(container, true);
    container.appendChild(createSectionLoader({ label: 'Details werden geladen' }));

    try {
      const [details, crossCheck] = await Promise.all([
        RequestsApi.getDetails(tmdbId, type),
        RequestsApi.crossCheck(tmdbId, type)
          .catch(() => ({ exists: false, seasons: [], requestedScopes: [] }))
      ]);

      // Der Cross-Check liefert die offenen Anfragen ALLER Nutzer für diesen
      // Titel — dieselbe Menge, gegen die der Server das Duplikat prüft.
      const coverage = buildRequestCoverage(crossCheck.requestedScopes || []);

      const normalized = normalizeRequestDetail(details, type);
      const isBanned = Boolean(details.banned || crossCheck.banned);
      const isRequested = Boolean(details.requested) || coverage.all;
      // Series are requested through the scope selector below the hero, which
      // also covers the partially available case; movies keep the single action.
      const canRequest = type !== 'tv' && !isRequested && !crossCheck.exists && !isBanned;

      const handleRequest = async (event) => {
        const btn = event.currentTarget;
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.textContent = 'Wird angefragt...';
        try {
          await RequestsApi.createRequest(tmdbId, type, '', { scope: 'all' });
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

      const statusContent = buildStatusContent({ crossCheck, isBanned, isRequested });
      const castSection = buildCastSection(details.cast);

      const scopeSelector = type === 'tv'
        ? createRequestScopeSelector({
          tmdbId,
          seasons: mergeSeasons(details.seasons, crossCheck.seasons),
          coverage,
          seriesExists: Boolean(crossCheck.exists),
          banned: isBanned
        })
        : null;

      const detailView = DetailView({
        item: normalized,
        actions,
        castSection,
        statusContent
      });

      container.innerHTML = '';
      while (detailView.firstChild) {
        container.appendChild(detailView.firstChild);
      }

      // The scope selector belongs between the hero and the cast section.
      const hero = container.querySelector('.detail-page');
      if (scopeSelector && hero) {
        container.insertBefore(scopeSelector.element, hero.nextSibling);
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
