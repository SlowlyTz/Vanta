import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { FEATURED_STUDIOS, matchFeaturedStudio } from '../constants/featuredStudios.js';

export default function PublishersPage() {
  const container = createElement('div', { className: 'page-container content-section' });

  const titleEl = createElement('h1', {
    style: {
      fontSize: '2rem',
      fontWeight: '700',
      marginBottom: 'var(--spacing-xl)',
      background: 'linear-gradient(135deg, #ffffff 0%, #a5a5a5 100%)',
      '-webkit-background-clip': 'text',
      '-webkit-text-fill-color': 'transparent'
    }
  }, 'Publisher');

  const bodySlot = createElement('div', { className: 'publishers-body' });

  container.appendChild(titleEl);
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

    const featured = [];
    const seen = new Set();
    const others = [];

    studios.forEach(studio => {
      const match = matchFeaturedStudio(studio.Name);
      if (match && !seen.has(match.label)) {
        seen.add(match.label);
        featured.push({ ...studio, _featured: match });
      } else if (!match) {
        others.push(studio);
      }
    });

    featured.sort((a, b) => {
      const order = FEATURED_STUDIOS.map(e => e.label);
      return order.indexOf(a._featured.label) - order.indexOf(b._featured.label);
    });

    const wrapper = createElement('div', {});

    if (featured.length > 0) {
      const featuredGrid = createElement('div', { className: 'publishers-featured-grid' });

      featured.forEach(studio => {
        const { label, image } = studio._featured;

        const card = createElement('button', {
          className: 'publisher-featured-card',
          'aria-label': label,
          onClick: () => {
            window.location.hash = `#/publisher/${encodeURIComponent(studio.Name)}`;
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
