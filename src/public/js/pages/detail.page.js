import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { createPersonPlaceholderSvg, getPersonImageUrl, getItemImageUrl } from '../utils/image.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { MediaCard } from '../components/mediaCard.js';
import { CastCarousel } from '../components/castCarousel.js';
import { DetailView } from '../components/detailView.js';
import { normalizeJellyfinItem } from '../utils/normalize.js';

export default function DetailPage({ id }) {
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

    const otherItems = normalizeKnownForItems(items.filter(i => i.Id !== id));

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
      const item = await MediaApi.getItem(id);

      let similar = [];
      let seasons = [];

      const tasks = [
        MediaApi.getSimilar(id).catch(err => {
          console.warn('Failed to load similar items:', err);
          return [];
        })
      ];

      if (item.Type === 'Series') {
        tasks.push(
          MediaApi.getSeasons(id).catch(err => {
            console.warn('Failed to load seasons:', err);
            return [];
          })
        );
      }

      const results = await Promise.all(tasks);
      similar = results[0];
      if (item.Type === 'Series') {
        seasons = results[1];
      }

      const normalized = normalizeJellyfinItem(item);

      const actors = normalized.actors || [];

      let castSection = null;
      if (actors.length > 0) {
        castSection = CastCarousel({
          actors,
          onActorClick: (actor) => openActorModal(actor)
        });
      }

      let seasonsSection = null;
      if (item.Type === 'Series' && seasons && seasons.length > 0) {
        seasonsSection = buildSeasonsSection(item, seasons);
      }

      let similarSection = null;
      if (similar && similar.length > 0) {
        similarSection = MediaCarousel({
          title: 'Ähnliche Titel',
          items: similar,
          landscape: false
        });
      }

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

  const buildSeasonsSection = (item, seasons) => {
    const episodeGrid = createElement('div', { className: 'episodes-grid' });
    const tabs = [];

    const loadSeasonEpisodes = async (seasonId, tabButton) => {
      const activeTab = seasonsTabsContainer.querySelector('.season-tab.active');
      if (activeTab) activeTab.classList.remove('active');
      tabButton.classList.add('active');

      episodeGrid.innerHTML = '';

      const gridLoader = createElement('div', { className: 'search-empty-state', style: { gridColumn: '1/-1', minHeight: '150px' } },
        createElement('div', { className: 'loader-spinner', style: { width: '30px', height: '30px' } })
      );
      episodeGrid.appendChild(gridLoader);

      try {
        const episodes = await MediaApi.getEpisodes(item.Id, seasonId);
        episodeGrid.innerHTML = '';

        if (episodes.length === 0) {
          episodeGrid.appendChild(
            createElement('div', { className: 'search-empty-state', style: { gridColumn: '1/-1' } },
              createElement('p', {}, 'Keine Episoden in dieser Staffel gefunden.')
            )
          );
        } else {
          episodes.forEach(episode => {
            const card = MediaCard({ item: episode, landscape: true });
            if (card) episodeGrid.appendChild(card);
          });
        }
      } catch (err) {
        console.error(err);
        episodeGrid.innerHTML = '';
        episodeGrid.appendChild(
          createElement('div', { className: 'search-empty-state', style: { gridColumn: '1/-1' } },
            createElement('p', {}, 'Fehler beim Laden der Episoden.')
          )
        );
      }
    };

    const seasonTabs = seasons.map((season, index) => {
      const tab = createElement('button', {
        className: `season-tab ${index === 0 ? 'active' : ''}`,
        onClick: (e) => {
          loadSeasonEpisodes(season.Id, e.target);
        }
      }, season.Name || `Staffel ${season.IndexNumber || index + 1}`);

      tabs.push(tab);
      return tab;
    });

    const seasonsTabsContainer = createElement('div', { className: 'seasons-tabs' }, seasonTabs);

    const seasonsSection = createElement('div', { className: 'seasons-section' },
      createElement('h3', { className: 'cast-title' }, 'Staffeln & Folgen'),
      seasonsTabsContainer,
      episodeGrid
    );

    setTimeout(() => {
      if (tabs[0] && seasons[0]) {
        loadSeasonEpisodes(seasons[0].Id, tabs[0]);
      }
    }, 50);

    return seasonsSection;
  };

  loadDetails();

  return container;
}
