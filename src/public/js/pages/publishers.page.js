// Publishers page: logo cards for the featured publishers and a searchable
// list of the other studios.
import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { getFeaturedPublishersFromStudios, matchFeaturedPublisher } from '../shared/featuredPublishers.js';

import { resolvePageScope } from '../utils/pageScope.js';
import { EmptyState, ErrorState } from '../components/emptyState.js';
import { PageHeading } from '../components/pageHeading.js';

const MIN_STUDIO_TITLES = 3;

export default function PublishersPage(params, pageScope) {
  const { signal } = resolvePageScope(pageScope);
  const container = createElement('div', { className: 'page-container content-section' });

  const bodySlot = createElement('div', { className: 'publishers-body' });

  container.appendChild(PageHeading({ title: 'Publisher' }));
  container.appendChild(bodySlot);

  const loadStudios = async () => {
    bodySlot.innerHTML = '';
    setSectionBusy(bodySlot, true);
    bodySlot.appendChild(createSectionLoader({ label: 'Publisher werden geladen' }));

    try {
      const studios = await MediaApi.getStudios({ signal });
      renderStudios(studios);
    } catch (error) {
      if (error.isAuthError) return;

      console.error('[Publishers Page Load Error]', error);
      appStore.showToast('Fehler beim Laden der Publisher', 'error');
      renderError(error.message);
    } finally {
      setSectionBusy(bodySlot, false);
    }
  };

  const renderError = (msg) => {
    bodySlot.innerHTML = '';
    bodySlot.appendChild(
      ErrorState({ message: msg || 'Die Publisher konnten nicht geladen werden.', retry: loadStudios })
    );
  };

  const renderStudios = (studios) => {
    bodySlot.innerHTML = '';

    if (!studios || studios.length === 0) {
      bodySlot.appendChild(
        EmptyState({ title: 'Keine Publisher gefunden', message: 'Es sind aktuell keine Publisher verfügbar.' })
      );
      return;
    }

    const featured = getFeaturedPublishersFromStudios(studios);
    // Only studios with a few titles are worth a button; entries without a
    // count (Jellyfin fallback without the mirror) stay visible.
    const others = studios.filter(studio =>
      !matchFeaturedPublisher(studio.Name)
      && (typeof studio.ItemCount !== 'number' || studio.ItemCount >= MIN_STUDIO_TITLES)
    );

    const wrapper = createElement('div', {});

    if (featured.length > 0) {
      const featuredGrid = createElement('div', { className: 'publishers-featured-grid' });

      featured.forEach(publisher => {
        const { id, label, image } = publisher;

        const card = createElement('button', {
          className: 'publisher-featured-card',
          'aria-label': label,
          onClick: () => {
            window.location.hash = `#/publisher-group/${encodeURIComponent(id)}`;
          }
        });

        if (image) {
          const img = createElement('img', {
            className: 'publisher-featured-logo',
            src: image,
            alt: label,
            loading: 'lazy'
          });
          img.onerror = () => { img.style.display = 'none'; };
          card.appendChild(img);
        }

        featuredGrid.appendChild(card);
      });

      wrapper.appendChild(featuredGrid);
    }

    if (others.length > 0) {
      const divider = createElement('div', { className: 'publishers-divider' });
      wrapper.appendChild(divider);

      const searchInput = createElement('input', {
        className: 'publisher-search-input',
        type: 'text',
        placeholder: 'Publisher suchen...',
        'aria-label': 'Publisher suchen'
      });

      const otherGrid = createElement('div', { className: 'publishers-grid' });

      const renderFilteredOthers = (term) => {
        const normalizedTerm = term.trim().toLowerCase();
        const filtered = normalizedTerm === ''
          ? others
          : others.filter(studio => studio.Name.toLowerCase().includes(normalizedTerm));

        otherGrid.innerHTML = '';

        if (filtered.length === 0) {
          otherGrid.appendChild(
            createElement('div', { className: 'publisher-search-empty' },
              'Keine Publisher gefunden'
            )
          );
          return;
        }

        filtered.forEach(studio => {
          const btn = createElement('button', {
            className: 'publisher-button',
            onClick: () => {
              window.location.hash = `#/publisher/${encodeURIComponent(studio.Name)}`;
            }
          }, studio.Name);

          otherGrid.appendChild(btn);
        });
      };

      searchInput.addEventListener('input', (e) => {
        renderFilteredOthers(e.target.value);
      });

      wrapper.appendChild(searchInput);
      wrapper.appendChild(otherGrid);

      renderFilteredOthers('');
    }

    bodySlot.appendChild(wrapper);
  };

  loadStudios();

  return container;
}
