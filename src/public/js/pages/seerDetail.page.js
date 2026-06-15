import { createElement } from '../utils/dom.js';
import { SeerApi } from '../api/seer.api.js';
import { appStore } from '../store/app.store.js';
import { DetailView } from '../components/detailView.js';
import { normalizeTmdbItem } from '../utils/normalize.js';
import { createPosterPlaceholder } from '../utils/poster.js';

export default function SeerDetailPage({ type, id }) {
  const container = createElement('div', { className: 'page-container' });

  const loadDetails = async () => {
    appStore.setLoading(true);
    try {
      let data;
      if (type === 'tv') {
        data = await SeerApi.getTvDetails(id);
      } else {
        data = await SeerApi.getMovieDetails(id);
      }

      if (data.mediaInfo && data.mediaInfo.jellyfinMediaId) {
        window.location.hash = `#/item/${data.mediaInfo.jellyfinMediaId}`;
        return;
      }

      const normalized = normalizeTmdbItem(data, type);

      let castSection = null;
      if (normalized.actors && normalized.actors.length > 0) {
        castSection = buildSeerCastSection(normalized.actors);
      }

      let seasonsSection = null;
      if (normalized.type === 'series' && normalized.seasons && normalized.seasons.length > 0) {
        seasonsSection = buildSeerSeasonsSection(normalized.seasons);
      }

      const requestAction = {
        label: 'Anfragen',
        className: 'btn-primary',
        icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M12 5v14M5 12h14"/></svg>',
        onClick: () => handleRequest(normalized, requestAction)
      };

      const backAction = {
        label: 'Zurück',
        className: 'btn-secondary',
        onClick: () => { window.history.back(); }
      };

      const detailView = DetailView({
        item: normalized,
        actions: [requestAction, backAction],
        castSection,
        seasonsSection,
        similarSection: null
      });

      container.innerHTML = '';
      while (detailView.firstChild) {
        container.appendChild(detailView.firstChild);
      }

    } catch (error) {
      console.error('[Seer Detail Page Load Error]', error);
      appStore.showToast('Fehler beim Laden der Details', 'error');
      container.innerHTML = '';
      container.appendChild(
        createElement('div', { className: 'content-section' },
          createElement('div', { className: 'search-empty-state' },
            createElement('h3', {}, 'Fehler beim Laden'),
            createElement('p', {}, error.message || 'Die Details konnten nicht abgerufen werden.'),
            createElement('button', {
              className: 'btn-primary',
              onClick: () => { window.location.hash = '#/requests'; }
            }, 'Zurück zu Anfragen')
          )
        )
      );
    } finally {
      appStore.setLoading(false);
    }
  };

  const handleRequest = async (normalized, requestAction) => {
    const btn = container.querySelector('.btn-primary');
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    btn.textContent = 'Anfragen...';

    try {
      await SeerApi.createRequest(normalized.tmdbType, normalized.itemId);
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M20 6L9 17l-5-5"/></svg>Angefragt';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-requested');
      appStore.showToast('Anfrage erfolgreich gesendet!', 'success');
    } catch (error) {
      console.error('[Seer Request Error]', error);
      const msg = error.message || 'Fehler beim Anfragen';
      if (msg.includes('already') || msg.includes('exist') || msg.includes('duplicate')) {
        btn.textContent = 'Bereits angefragt';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-requested');
      } else {
        btn.textContent = 'Fehler';
        btn.classList.add('btn-request-error');
        setTimeout(() => {
          btn.innerHTML = requestAction.icon + requestAction.label;
          btn.classList.remove('btn-request-error');
          btn.disabled = false;
        }, 2000);
      }
      appStore.showToast(msg, 'error');
    }
  };

  const buildSeerCastSection = (actors) => {
    const cards = actors.map(actor => {
      const imageUrl = actor.profileUrl || createPosterPlaceholder(actor.Name || '?');

      const card = createElement('div', { className: 'cast-card' },
        createElement('img', {
          src: imageUrl,
          alt: actor.Name,
          className: 'cast-avatar',
          loading: 'lazy',
          onError: (e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = createPosterPlaceholder(actor.Name || '?');
          }
        }),
        createElement('div', { className: 'cast-name' }, actor.Name),
        actor.Role ? createElement('div', { className: 'cast-role' }, actor.Role) : null
      );
      return card;
    });

    const listContainer = createElement('div', {
      className: 'cast-list',
      tabindex: '0',
      role: 'list'
    }, ...cards);

    return createElement('div', { className: 'detail-cast-section' },
      createElement('div', { className: 'carousel-header' },
        createElement('h3', { className: 'cast-title' }, 'Besetzung')
      ),
      listContainer
    );
  };

  const buildSeerSeasonsSection = (seasons) => {
    const seasonItems = seasons.map(season => {
      const posterUrl = season.posterUrl || createPosterPlaceholder(season.name || '?');

      const card = createElement('div', { className: 'seer-season-card' },
        createElement('img', {
          src: posterUrl,
          alt: season.name,
          className: 'seer-season-poster',
          loading: 'lazy',
          onError: (e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = createPosterPlaceholder(season.name || '?');
          }
        }),
        createElement('div', { className: 'seer-season-info' },
          createElement('div', { className: 'seer-season-name' }, season.name),
          createElement('div', { className: 'seer-season-episodes' }, `${season.episodeCount} Folgen`)
        )
      );
      return card;
    });

    const grid = createElement('div', { className: 'seer-seasons-grid' }, ...seasonItems);

    return createElement('div', { className: 'seasons-section' },
      createElement('h3', { className: 'cast-title' }, 'Staffeln'),
      grid
    );
  };

  loadDetails();

  return container;
}
