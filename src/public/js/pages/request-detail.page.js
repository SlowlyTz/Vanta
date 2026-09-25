import { createElement } from '../utils/dom.js';
import { RequestsApi } from '../api/requests.api.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader } from '../components/loader.js';
import { openTrailerModal } from '../components/trailerModal.js';
import { createBackIcon } from '../components/navbar/icons.js';
import { mergeSeasons, buildRequestCoverage } from './requests/helpers.js';
import { createSeriesPicker } from './requests/seriesPicker.js';
import { getTmdbImageUrl, createPosterPlaceholder } from '../utils/poster.js';

const chip = (text, tone) => createElement('span', { className: `ui-chip ${tone}` }, text);

// Title-level state of a request page: what the hero says in one chip.
function titleStatus({ isMovie, crossCheck, isBanned, isRequested, seasons }) {
  if (isBanned) return chip('Abgelehnt', 'ui-chip-danger');
  if (isMovie) {
    if (crossCheck.exists) return chip('In Bibliothek', 'ui-chip-success');
    if (isRequested) return chip('Angefragt', 'ui-chip-warning');
    return null;
  }
  if (crossCheck.exists) {
    const regular = seasons.filter(season => !season.special);
    const complete = regular.every(season => season.complete);
    return complete ? chip('In Bibliothek', 'ui-chip-success') : chip('Teilweise in Bibliothek', 'ui-chip-accent');
  }
  if (isRequested) return chip('Angefragt', 'ui-chip-warning');
  return null;
}

function buildHero({ details, type, statusChip, onTrailer }) {
  const title = details.title || details.name || 'Unbekannt';
  const year = (details.release_date || details.first_air_date || '').slice(0, 4);
  const meta = [
    type === 'tv' ? 'Serie' : 'Film',
    year || null,
    details.runtime ? `${details.runtime} Min.` : null,
    type === 'tv' && details.number_of_seasons ? `${details.number_of_seasons} Staffeln` : null
  ].filter(Boolean).join(' · ');
  const genres = (details.genres || []).map(genre => genre.name).filter(Boolean).slice(0, 3);
  const backdrop = getTmdbImageUrl(details.backdrop_path, 'w1280');
  const poster = getTmdbImageUrl(details.poster_path, 'w342');

  return createElement('section', { className: 'request-hero' },
    backdrop ? createElement('div', { className: 'request-hero-backdrop', style: `background-image:url("${backdrop}")` }) : null,
    createElement('img', {
      className: 'request-hero-poster',
      src: poster || createPosterPlaceholder(title),
      alt: '',
      onError: event => { event.currentTarget.onerror = null; event.currentTarget.src = createPosterPlaceholder(title); }
    }),
    createElement('div', { className: 'request-hero-body' },
      createElement('div', { className: 'request-hero-chips' },
        statusChip,
        ...genres.map(genre => chip(genre, 'ui-chip-muted'))
      ),
      createElement('h1', { className: 'request-hero-title' }, title),
      createElement('p', { className: 'request-hero-meta' }, meta),
      details.overview ? createElement('p', { className: 'request-hero-overview' }, details.overview) : null,
      onTrailer ? createElement('div', { className: 'request-hero-actions' },
        createElement('button', { className: 'ui-button ui-button-secondary', type: 'button', onClick: onTrailer }, 'Trailer ansehen')
      ) : null
    )
  );
}

// The action for a movie: request it, or say why not and offer the way on.
function buildMovieAction({ tmdbId, crossCheck, isBanned, isRequested }) {
  const text = createElement('span', { className: 'ui-action-bar-text' });
  const button = createElement('button', { className: 'ui-button ui-button-primary', type: 'button' });
  const bar = createElement('div', { className: 'ui-action-bar request-movie-bar' }, text, button);

  const show = (message, label, { disabled = false, onClick = null } = {}) => {
    text.textContent = message;
    button.textContent = label;
    button.disabled = disabled;
    button.onclick = onClick;
  };

  if (crossCheck.exists && crossCheck.jellyfinItemId) {
    show('Dieser Film ist schon in der Bibliothek.', 'Ansehen', { onClick: () => { window.location.hash = `#/item/${crossCheck.jellyfinItemId}`; } });
  } else if (crossCheck.exists) {
    show('Dieser Film ist schon in der Bibliothek.', 'Verfügbar', { disabled: true });
  } else if (isBanned) {
    show('Dieser Film wurde abgelehnt und kann nicht erneut angefragt werden.', 'Abgelehnt', { disabled: true });
  } else if (isRequested) {
    show('Dieser Film ist bereits angefragt. Du bekommst Bescheid, sobald entschieden ist.', 'Angefragt', { disabled: true });
  } else {
    show('Fehlt dir dieser Film? Frag ihn an.', 'Film anfragen', {
      onClick: async () => {
        show('Wird angefragt …', 'Film anfragen', { disabled: true });
        try {
          await RequestsApi.createRequest(tmdbId, 'movie', '', { scope: 'all' });
          show('Angefragt! Du bekommst Bescheid, sobald entschieden ist.', 'Angefragt', { disabled: true });
          appStore.showToast('Film angefragt', 'success');
        } catch (error) {
          show('Fehlt dir dieser Film? Frag ihn an.', 'Film anfragen');
          appStore.showToast(error.message || 'Anfrage fehlgeschlagen', 'error');
        }
      }
    });
  }

  return bar;
}

function buildCast(cast) {
  if (!cast?.length) return null;
  return createElement('section', { className: 'ui-section request-cast' },
    createElement('h2', { className: 'ui-group-title' }, 'Besetzung'),
    createElement('div', { className: 'request-cast-row' },
      ...cast.slice(0, 16).map(actor => createElement('div', { className: 'request-cast-item' },
        actor.profile_path
          ? createElement('img', { src: getTmdbImageUrl(actor.profile_path, 'w185'), alt: '', loading: 'lazy' })
          : createElement('span', { className: 'request-cast-initial' }, (actor.name || '?').charAt(0)),
        createElement('strong', {}, actor.name),
        actor.character ? createElement('span', {}, actor.character) : null
      ))
    )
  );
}

// Request page of one TMDB title: the hero with its state, then either the
// movie's action or the series picker (whole series, seasons, episodes —
// also for a series that is partly in the library already).
export default function RequestDetailPage({ type, id }) {
  const tmdbId = parseInt(id, 10);
  const container = createElement('div', { className: 'page-container content-section' });
  const page = createElement('div', { className: 'ui-page request-detail' });
  container.appendChild(page);

  const load = async () => {
    page.innerHTML = '';
    page.appendChild(createSectionLoader({ label: 'Details werden geladen' }));

    try {
      const [details, crossCheck] = await Promise.all([
        RequestsApi.getDetails(tmdbId, type),
        RequestsApi.crossCheck(tmdbId, type).catch(() => ({ exists: false, seasons: [], requestedScopes: [] }))
      ]);

      // Open requests of every user for this title — the same set the server
      // checks duplicates against.
      const coverage = buildRequestCoverage(crossCheck.requestedScopes || []);
      const isBanned = Boolean(details.banned || crossCheck.banned);
      const isRequested = Boolean(details.requested) || coverage.all;
      const seasons = type === 'tv' ? mergeSeasons(details.seasons, crossCheck.seasons) : [];

      const trailer = details.trailer?.site === 'YouTube' && details.trailer.key
        ? () => openTrailerModal({ title: `${details.title || details.name} Trailer`, videoId: details.trailer.key })
        : null;

      page.innerHTML = '';
      page.append(
        createElement('button', {
          className: 'ui-button ui-button-ghost request-back',
          type: 'button',
          onClick: () => {
            if (window.history.length > 1) window.history.back();
            else window.location.hash = '#/requests';
          }
        }, createBackIcon(), 'Zurück'),
        buildHero({
          details,
          type,
          statusChip: titleStatus({ isMovie: type !== 'tv', crossCheck, isBanned, isRequested, seasons }),
          onTrailer: trailer
        }),
        type === 'tv'
          ? createSeriesPicker({ tmdbId, seasons, coverage, seriesExists: Boolean(crossCheck.exists), banned: isBanned }).element
          : buildMovieAction({ tmdbId, crossCheck, isBanned, isRequested })
      );
      const cast = buildCast(details.cast);
      if (cast) page.appendChild(cast);
    } catch (error) {
      if (error.isAuthError) return;
      console.error('[Request Detail Page Error]', error);
      page.innerHTML = '';
      page.appendChild(createElement('div', { className: 'ui-empty' },
        createElement('strong', {}, 'Fehler beim Laden'),
        createElement('p', {}, error.message || 'Die Details konnten nicht abgerufen werden.'),
        createElement('button', { className: 'ui-button ui-button-secondary', type: 'button', onClick: load }, 'Erneut versuchen')
      ));
    }
  };

  load();
  return container;
}
