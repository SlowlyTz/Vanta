import { createElement } from '../utils/dom.js';
import { SeerApi } from '../api/seer.api.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { DetailView } from '../components/detailView.js';
import { normalizeTmdbItem } from '../utils/normalize.js';
import { createPersonPlaceholderSvg, getPersonImageUrl } from '../utils/image.js';
import { createPosterPlaceholder } from '../utils/poster.js';
import { CastCarousel } from '../components/castCarousel.js';
import { MediaCarousel } from '../components/mediaCarousel.js';

export default function SeerDetailPage({ type, id }) {
  const container = createElement('div', { className: 'page-container' });
  let modalScrollY = 0;

  const modalOverlay = createElement('div', { className: 'actor-modal-overlay' });

  const lockModalScroll = () => {
    modalScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add('actor-modal-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${modalScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  };

  const unlockModalScroll = () => {
    document.body.classList.remove('actor-modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, modalScrollY);
  };

  const closeModal = () => {
    if (!modalOverlay.classList.contains('active')) return;
    modalOverlay.classList.remove('active');
    unlockModalScroll();
    window.removeEventListener('keydown', handleEscapeKey);
    modalOverlay.onclick = null;
    modalOverlay.remove();
  };

  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') closeModal();
  };

  const openActorModal = async (actor) => {
    modalOverlay.innerHTML = '';

    const modalClose = createElement('button', {
      className: 'actor-modal-close',
      onClick: () => closeModal()
    });
    modalClose.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

    const modalContent = createElement('div', { className: 'actor-modal' },
      modalClose,
      createElement('div', { className: 'search-empty-state', style: { minHeight: '300px' } },
        createElement('div', { className: 'loader-spinner' })
      )
    );

    modalOverlay.appendChild(modalContent);
    if (!modalOverlay.isConnected) {
      document.body.appendChild(modalOverlay);
    }
    modalOverlay.classList.add('active');
    lockModalScroll();

    window.addEventListener('keydown', handleEscapeKey);

    modalOverlay.onclick = (e) => {
      if (e.target === modalOverlay) closeModal();
    };

    try {
      let person = null;
      let items = [];

      if (actor.Id) {
        try {
          person = await MediaApi.getPerson(actor.Id);
        } catch (e) {
          console.warn(`Failed to fetch person by ID ${actor.Id}, trying name lookup.`, e);
        }
      }

      if (!person && actor.Name) {
        person = await MediaApi.getPersonByName(actor.Name);
      }

      if (person) {
        try {
          items = await MediaApi.getPersonItems(person.Id);
        } catch (e) {
          console.warn(`Failed to fetch items for person ID ${person.Id}, trying name lookup.`, e);
        }
      }

      if (items.length === 0 && actor.Name) {
        items = await MediaApi.getPersonItemsByName(actor.Name);
      }

      if (!person) {
        throw new Error('Details zum Schauspieler konnten in Jellyfin nicht gefunden werden.');
      }

      renderModalDetails(modalContent, person, actor.Role, items);
    } catch (err) {
      console.error('[Actor Modal Error]', err);
      modalContent.innerHTML = '';
      modalContent.appendChild(modalClose);
      modalContent.appendChild(
        createElement('div', { className: 'search-empty-state' },
          createElement('h3', {}, 'Details konnten nicht geladen werden'),
          createElement('p', {}, err.message || 'Die Person ist auf dem Server nicht näher dokumentiert.')
        )
      );
    }
  };

  const renderModalDetails = (modalContent, person, role, items) => {
    modalContent.innerHTML = '';

    const modalClose = createElement('button', {
      className: 'actor-modal-close',
      onClick: () => closeModal()
    });
    modalClose.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    modalContent.appendChild(modalClose);

    const avatarPlaceholder = createPersonPlaceholderSvg(person.Name || '');
    const avatarImg = createElement('img', {
      src: getPersonImageUrl(person, 280),
      alt: person.Name,
      className: 'actor-modal-avatar',
      loading: 'lazy',
      onError: (event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = avatarPlaceholder;
      }
    });

    const infoContainer = createElement('div', { className: 'actor-profile-info' },
      createElement('h2', { className: 'actor-modal-name' }, person.Name)
    );

    if (role) {
      infoContainer.appendChild(
        createElement('div', { className: 'actor-modal-role' }, `als ${role}`)
      );
    }

    const metadataList = createElement('div', { className: 'actor-metadata-list' });

    if (person.PremiereDate) {
      const birthday = new Date(person.PremiereDate);
      if (!isNaN(birthday.getTime())) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const formattedBday = birthday.toLocaleDateString('de-DE', options);
        metadataList.appendChild(
          createElement('span', {}, [
            createElement('strong', {}, 'Geboren: '),
            formattedBday
          ])
        );
      }
    }

    if (person.ProductionLocations && person.ProductionLocations.length > 0) {
      metadataList.appendChild(
        createElement('span', {}, [
          createElement('strong', {}, 'Geburtsort: '),
          person.ProductionLocations[0]
        ])
      );
    }

    if (metadataList.children.length > 0) {
      infoContainer.appendChild(metadataList);
    }

    const profileRow = createElement('div', { className: 'actor-profile-row' },
      avatarImg,
      infoContainer
    );
    modalContent.appendChild(profileRow);

    if (person.Overview) {
      modalContent.appendChild(
        createElement('div', { className: 'actor-bio' }, person.Overview)
      );
    }

    const otherItems = normalizeKnownForItems(items);

    if (otherItems.length > 0) {
      const knownForCarousel = MediaCarousel({
        title: 'Bekannt für',
        items: otherItems,
        landscape: false
      });

      if (knownForCarousel) {
        knownForCarousel.classList.add('actor-known-for-carousel');
        knownForCarousel.addEventListener('click', (event) => {
          if (event.target.closest('.media-card')) closeModal();
        });
        modalContent.appendChild(knownForCarousel);
      }
    } else {
      modalContent.appendChild(
        createElement('div', { className: 'media-carousel-container' },
          createElement('h3', { className: 'carousel-title-text', style: { fontSize: '1.25rem', marginBottom: 'var(--spacing-sm)' } }, 'Bekannt für'),
          createElement('div', { className: 'search-empty-state', style: { minHeight: '100px' } }, 'Keine weiteren Titel in der Mediathek gefunden.')
        )
      );
    }
  };

  const normalizeKnownForItems = (items = []) => {
    const normalized = new Map();

    items.forEach(item => {
      if (!item) return;

      if ((item.Type === 'Episode' || item.Type === 'Season') && item.SeriesId) {
        const key = `Series:${item.SeriesId}`;
        if (!normalized.has(key)) {
          normalized.set(key, {
            ...item,
            Id: item.SeriesId,
            Type: 'Series',
            Name: item.SeriesName || item.Name,
            ImageTags: item.SeriesPrimaryImageTag ? { Primary: item.SeriesPrimaryImageTag } : undefined,
            ChildCount: item.ChildCount,
            UserData: null
          });
        }
        return;
      }

      const key = `${item.Type || 'Item'}:${item.Id}`;
      if (!normalized.has(key)) {
        normalized.set(key, item);
      }
    });

    return Array.from(normalized.values());
  };

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
        castSection = CastCarousel({
          actors: normalized.actors,
          onActorClick: (actor) => openActorModal(actor)
        });
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
