import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { getFeaturedPublishersFromStudios, matchFeaturedPublisher } from '../constants/featuredPublishers.js';
import { PageHeading } from '../components/pageHeading.js';

export default function PublishersPage() {
  const container = createElement('div', { className: 'page-container content-section' });

  const bodySlot = createElement('div', { className: 'publishers-body' });

  container.appendChild(PageHeading({ title: 'Publisher' }));
  container.appendChild(bodySlot);

  const loadStudios = async () => {
    bodySlot.innerHTML = '';
    setSectionBusy(bodySlot, true);
    bodySlot.appendChild(createSectionLoader({ label: 'Publisher werden geladen' }));

    try {
      const studios = await MediaApi.getStudios();
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
      createElement('div', { className: 'search-empty-state' },
        createElement('h3', {}, 'Fehler beim Laden'),
        createElement('p', {}, msg || 'Die Publisher konnten nicht geladen werden.'),
        createElement('button', {
          className: 'btn-primary',
          onClick: loadStudios
        }, 'Erneut versuchen')
      )
    );
  };

  const renderStudios = (studios) => {
    bodySlot.innerHTML = '';

    if (!studios || studios.length === 0) {
      bodySlot.appendChild(
        createElement('div', { className: 'search-empty-state' },
          createElement('h3', {}, 'Keine Publisher gefunden'),
          createElement('p', {}, 'Es sind aktuell keine Publisher verfügbar.')
        )
      );
      return;
    }

    const featured = getFeaturedPublishersFromStudios(studios);
    const others = studios.filter(studio => !matchFeaturedPublisher(studio.Name));

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
