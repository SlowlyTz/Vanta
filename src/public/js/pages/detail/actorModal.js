import { createElement } from '../../utils/dom.js';
import { MediaApi } from '../../api/media.api.js';
import { PERSON_PLACEHOLDER_URL, getPersonImageUrl } from '../../utils/image.js';
import { MediaCarousel } from '../../components/mediaCarousel.js';
import { createSectionLoader, setSectionBusy } from '../../components/loader.js';
import { ErrorState } from '../../components/emptyState.js';
import { openModal } from '../../utils/modal.js';
import { createExpandableText } from '../../components/expandableText.js';

export function createActorModal({ currentItemId }) {
  const modalOverlay = createElement('div', { className: 'actor-modal-overlay' });
  let modal = null;
  // Each opening gets a number: a slow answer for an actor clicked before
  // must not fill the dialog of the one clicked after.
  let openRun = 0;

  const closeModal = () => modal?.close();

  const createModalCloseButton = () => {
    const button = createElement('button', {
      className: 'actor-modal-close',
      type: 'button',
      'aria-label': 'Schließen',
      onClick: () => closeModal()
    });
    button.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
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
    const avatarImg = createElement('img', {
      src: getPersonImageUrl(person, 280),
      alt: person.Name,
      className: 'actor-modal-avatar',
      loading: 'lazy',
      onError: (event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = PERSON_PLACEHOLDER_URL;
      }
    });

    const infoContainer = createElement('div', { className: 'actor-profile-info' },
      createElement('h2', { className: 'actor-modal-name', id: 'actor-modal-name' }, person.Name)
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
      modalContent.appendChild(createExpandableText({ text: person.Overview, lines: 6, className: 'actor-bio' }));
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
      modalContent.appendChild(createElement('p', { className: 'actor-known-for-empty' }, 'Keine weiteren Titel in der Mediathek.'));
    }
  };

  const openActorModal = async (actor) => {
    const run = ++openRun;
    modalOverlay.innerHTML = '';

    const modalClose = createModalCloseButton();
    const modalContent = createElement('div', { className: 'actor-modal' },
      modalClose,
      createSectionLoader({ label: 'Schauspieler wird geladen' })
    );

    modalOverlay.appendChild(modalContent);
    modalOverlay.classList.add('active');
    setSectionBusy(modalContent, true);

    if (!modal?.isOpen) {
      modal = openModal({
        overlay: modalOverlay,
        dialog: modalOverlay,
        initialFocus: modalClose,
        label: actor.Name || 'Schauspieler',
        onClose: () => {
          openRun++;
          modalOverlay.classList.remove('active');
          modalOverlay.removeAttribute('aria-labelledby');
          modal = null;
        }
      });
    }
    modalOverlay.removeAttribute('aria-labelledby');
    modalOverlay.setAttribute('aria-label', actor.Name || 'Schauspieler');
    // The box is rebuilt per actor; the overlay is the dialog.
    window.requestAnimationFrame?.(() => modalOverlay.querySelector('.actor-modal-close')?.focus({ preventScroll: true }));
    const stale = () => run !== openRun;

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

      if (stale()) return;
      if (!person) {
        throw new Error('Details zum Schauspieler konnten in Jellyfin nicht gefunden werden.');
      }

      renderModalDetails(modalContent, person, actor.Role, items);
      modalOverlay.removeAttribute('aria-label');
      modalOverlay.setAttribute('aria-labelledby', 'actor-modal-name');

    } catch (err) {
      if (stale()) return;
      console.error('[Actor Modal Error]', err);
      modalContent.innerHTML = '';
      modalContent.appendChild(createModalCloseButton());
      modalContent.appendChild(
        ErrorState({
          title: 'Details konnten nicht geladen werden',
          message: err.message || 'Die Person ist auf dem Server nicht näher dokumentiert.'
        })
      );
    } finally {
      setSectionBusy(modalContent, false);
      // The box was rebuilt, the focused close button with it.
      if (!stale() && !modalOverlay.contains(document.activeElement)) {
        modalOverlay.querySelector('.actor-modal-close')?.focus({ preventScroll: true });
      }
    }
  };

  return { openActorModal };
}
