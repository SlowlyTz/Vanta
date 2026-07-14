import { createElement } from '../../utils/dom.js';
import { RequestsApi } from '../../api/requests.api.js';
import { appStore } from '../../store/app.store.js';
import { setSectionBusy } from '../../components/loader.js';
import { createPosterPlaceholder } from '../../utils/poster.js';
import { saveRequestSearchState, clearRequestSearchState, getTmdbImageUrl } from './helpers.js';

export function bindSearch(ctx) {
  ctx.createSearchResultCard = item => {
    const isMovie = item.media_type === 'movie';
    const title = item.title || item.name || 'Unbekannt';
    const posterUrl = getTmdbImageUrl(item.poster_path);
    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
    const typeLabel = isMovie ? 'Film' : 'Serie';
    const overview = item.overview || 'Keine Beschreibung.';
    const tmdbId = item.id;
    const tmdbType = item.media_type;

    const isDisabled = item.banned || item.exists || item.requested;

    const card = createElement('div', {
      className: `request-card request-card-clickable${isDisabled ? ' request-card-disabled' : ''}`,
      'data-tmdb-id': tmdbId,
      onClick: () => {
        if (isDisabled) return;
        window.location.hash = `#/request-detail/${tmdbType}/${tmdbId}`;
      }
    });

    const poster = createElement('img', {
      className: 'request-card-poster',
      src: posterUrl || createPosterPlaceholder(title),
      alt: title,
      loading: 'lazy',
      onError: (e) => { e.currentTarget.onerror = null; e.currentTarget.src = createPosterPlaceholder(title); }
    });

    const info = createElement('div', { className: 'request-card-info' },
      createElement('div', { className: 'request-card-meta' },
        createElement('span', { className: 'request-card-type' }, typeLabel),
        year ? createElement('span', { className: 'request-card-year' }, year) : null
      ),
      createElement('h3', { className: 'request-card-title' }, title),
      createElement('p', { className: 'request-card-overview' }, overview.length > 150 ? overview.substring(0, 150) + '...' : overview)
    );

    const statusBadge = createElement('div', { className: 'request-card-status-row' });

    if (item.banned) {
      statusBadge.appendChild(createElement('span', { className: 'request-result-badge request-result-badge-error' }, 'Gebannt'));
    } else if (item.exists) {
      statusBadge.appendChild(createElement('span', { className: 'request-result-badge request-result-badge-available' }, 'In Mediathek verfügbar'));
    } else if (item.requested) {
      statusBadge.appendChild(createElement('span', { className: 'request-result-badge request-result-badge-requested' }, 'Bereits angefragt'));
    }

    if (statusBadge.children.length > 0) {
      info.appendChild(statusBadge);
    }

    card.appendChild(poster);
    card.appendChild(info);

    return card;
  };

  ctx.performSearch = async query => {
    const runId = ++ctx.searchRunId;
    ctx.newRequestResultsGrid.innerHTML = '';
    ctx.searchResults = [];

    if (!query) {
      clearRequestSearchState();
      ctx.newRequestLoading.classList.add('hidden');
      setSectionBusy(ctx.newRequestResultsGrid, false);
      ctx.newRequestStatus.innerHTML = '';
      ctx.newRequestStatus.appendChild(createElement('h3', {}, 'Medien anfragen'));
      ctx.newRequestStatus.appendChild(createElement('p', {}, 'Suche nach Filmen oder Serien und frage sie an.'));
      ctx.newRequestStatus.classList.remove('hidden');
      return;
    }

    ctx.newRequestStatus.classList.add('hidden');
    ctx.newRequestLoading.classList.remove('hidden');
    setSectionBusy(ctx.newRequestResultsGrid, true);

    try {
      const data = await RequestsApi.search(query);
      if (runId !== ctx.searchRunId) return;

      ctx.searchResults = data || [];
      saveRequestSearchState(query, ctx.searchResults);
      ctx.newRequestResultsGrid.innerHTML = '';
      ctx.newRequestLoading.classList.add('hidden');

      if (ctx.searchResults.length === 0) {
        ctx.newRequestStatus.innerHTML = '';
        ctx.newRequestStatus.appendChild(createElement('h3', {}, 'Keine Ergebnisse'));
        ctx.newRequestStatus.appendChild(createElement('p', {}, `Nichts gefunden für "${query}".`));
        ctx.newRequestStatus.classList.remove('hidden');
      } else {
        ctx.searchResults.forEach(item => {
          ctx.newRequestResultsGrid.appendChild(ctx.createSearchResultCard(item));
        });
      }
    } catch (error) {
      if (runId !== ctx.searchRunId) return;
      if (error.isAuthError) {
        ctx.newRequestLoading.classList.add('hidden');
        return;
      }

      console.error('[Requests Search Error]', error);
      appStore.showToast('Suche fehlgeschlagen', 'error');
    } finally {
      if (runId === ctx.searchRunId) {
        ctx.newRequestLoading.classList.add('hidden');
        setSectionBusy(ctx.newRequestResultsGrid, false);
      }
    }
  };

  return ctx;
}
