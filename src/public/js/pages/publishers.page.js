import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';

const FEATURED_STUDIOS = [
  { match: ['disney', 'walt disney', 'walt disney pictures', 'walt disney studios', 'walt disney animation studios'], label: 'Disney', image: '/assets/publisher/disney.webp' },
  { match: ['20th century', '20th century studios', '20th century fox', 'twentieth century fox'], label: '20th Century Studios', image: '/assets/publisher/20th-century.webp' },
  { match: ['warner bros', 'warner bros pictures', 'warner brothers', 'warner bros.'], label: 'Warner Bros', image: '/assets/publisher/warner-bros.webp' },
  { match: ['netflix'], label: 'Netflix', image: '/assets/publisher/netflix.webp' },
  { match: ['apple tv', 'apple tv+', 'appletv', 'apple'], label: 'Apple TV', image: '/assets/publisher/appletv.webp' },
  { match: ['amazon', 'prime video', 'amazon studios', 'amazon prime', 'amazon mgm studios'], label: 'Prime Video', image: '/assets/publisher/prime.webp' },
  { match: ['hbo', 'hbo max', 'hbo films', 'home box office'], label: 'HBO', image: '/assets/publisher/hbo.webp' }
];

function matchFeatured(studioName) {
  const lower = studioName.toLowerCase();
  for (const entry of FEATURED_STUDIOS) {
    if (entry.match.some(pattern => lower === pattern || lower.startsWith(pattern))) {
      return entry;
    }
  }
  return null;
}

export default function PublishersPage() {
  const container = createElement('div', { className: 'page-container content-section' });

  const loadStudios = async () => {
    appStore.setLoading(true);
    try {
      const studios = await MediaApi.getStudios();
      renderStudios(studios);
    } catch (error) {
      console.error('[Publishers Page Load Error]', error);
      appStore.showToast('Fehler beim Laden der Publisher', 'error');
      renderError(error.message);
    } finally {
      appStore.setLoading(false);
    }
  };

  const renderError = (msg) => {
    container.innerHTML = '';
    container.appendChild(
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
    container.innerHTML = '';

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

    if (!studios || studios.length === 0) {
      container.appendChild(
        createElement('div', {},
          titleEl,
          createElement('div', { className: 'search-empty-state' },
            createElement('h3', {}, 'Keine Publisher gefunden'),
            createElement('p', {}, 'Es sind aktuell keine Publisher verfügbar.')
          )
        )
      );
      return;
    }

    const featured = [];
    const seen = new Set();
    const others = [];

    studios.forEach(studio => {
      const match = matchFeatured(studio.Name);
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

      const otherGrid = createElement('div', { className: 'publishers-grid' });

      others.forEach(studio => {
        const btn = createElement('button', {
          className: 'publisher-button',
          onClick: () => {
            window.location.hash = `#/publisher/${encodeURIComponent(studio.Name)}`;
          }
        }, studio.Name);

        otherGrid.appendChild(btn);
      });

      wrapper.appendChild(otherGrid);
    }

    container.appendChild(
      createElement('div', {},
        titleEl,
        wrapper
      )
    );
  };

  loadStudios();

  return container;
}
