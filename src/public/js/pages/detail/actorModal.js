import { createElement } from '../../utils/dom.js';
import { MediaApi } from '../../api/media.api.js';
import { createPersonPlaceholderSvg, getPersonImageUrl } from '../../utils/image.js';
import { MediaCarousel } from '../../components/mediaCarousel.js';
import { createSectionLoader, setSectionBusy } from '../../components/loader.js';

export function createActorModal({ currentItemId }) {
  const modalOverlay = createElement('div', { className: 'actor-modal-overlay' });
  let modalScrollY = 0;

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

  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') closeModal();
  };

  const closeModal = () => {
    if (!modalOverlay.classList.contains('active')) return;
    modalOverlay.classList.remove('active');
    unlockModalScroll();
    window.removeEventListener('keydown', handleEscapeKey);
    modalOverlay.onclick = null;
    modalOverlay.remove();
  };

  const createModalCloseButton = () => {
    const button = createElement('button', {
      className: 'actor-modal-close',
      onClick: () => closeModal()
    });
    button.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    return button;
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

  const renderModalDetails = (modalContent, person, role, items) => {
    modalContent.innerHTML = '';

    const modalClose = createModalCloseButton();
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

    const otherItems = normalizeKnownForItems(items.filter(i => i.Id !== currentItemId));

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

  const openActorModal = async (actor) => {
    modalOverlay.innerHTML = '';

    const modalClose = createModalCloseButton();
    const modalContent = createElement('div', { className: 'actor-modal' },
      modalClose,
      createSectionLoader({ label: 'Schauspieler wird geladen' })
    );

    modalOverlay.appendChild(modalContent);
    if (!modalOverlay.isConnected) {
      document.body.appendChild(modalOverlay);
    }
    modalOverlay.classList.add('active');
    setSectionBusy(modalContent, true);
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
      modalContent.appendChild(createModalCloseButton());
      modalContent.appendChild(
        createElement('div', { className: 'search-empty-state' },
          createElement('h3', {}, 'Details konnten nicht geladen werden'),
          createElement('p', {}, err.message || 'Die Person ist auf dem Server nicht näher dokumentiert.')
        )
      );
    } finally {
      setSectionBusy(modalContent, false);
    }
  };

  return { openActorModal };
}
