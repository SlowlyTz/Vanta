import { createElement } from '../utils/dom.js';
import { appStore } from '../store/app.store.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { CastCarousel } from '../components/castCarousel.js';
import { DetailView } from '../components/detailView.js';
import { createActorModal } from './detail/actorModal.js';
import { buildSeasonsSection } from './detail/seasonsSection.js';
import { loadDetailData } from './detail/detailData.js';

export default function DetailPage({ id }) {
  const container = createElement('div', { className: 'page-container' });
  const actorModal = createActorModal({ currentItemId: id });

  const render = async () => {
    appStore.setLoading(true);
    try {
      const { item, similar, seasons, normalized } = await loadDetailData(id);

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
        {
          label: 'Zurück',
          className: 'btn-secondary',
          onClick: () => { window.history.back(); }
        }
      ];

      const detailView = DetailView({
        item: normalized,
        actions,
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
      appStore.setLoading(false);
    }
  };

  render();

  return container;
}
