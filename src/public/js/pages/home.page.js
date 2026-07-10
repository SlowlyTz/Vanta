import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { FeaturedMediaCarousel } from '../components/featuredMediaCarousel.js';
import { HeroCarousel } from '../components/heroCarousel.js';
import { getRouteState, saveRouteState, consumeReturnMarker } from '../utils/routeState.js';

const HOME_ROUTE = '#/home';
const HOME_SECTION_GROUPS = [
  { key: 'now-playing', title: 'Jetzt im Kino', loadingLabel: 'Aktuelle Kinofilme werden geladen' },
  { key: 'featured', title: 'Empfohlen', loadingLabel: 'Empfehlungen werden geladen' },
  { key: 'publishers', title: 'Publisher', loadingLabel: 'Publisher werden geladen' },
  { key: 'genres', title: 'Kategorien', loadingLabel: 'Kategorien werden geladen' }
];

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function HomePage() {
  const container = createElement('div', { className: 'page-container' });
  let sectionsContainer = null;
  let currentData = null;
  const sectionGroupResults = new Map();

  const returnMarker = consumeReturnMarker(HOME_ROUTE);
  let pendingRestore = returnMarker ? { scrollY: returnMarker.scrollY, itemId: returnMarker.itemId } : null;
  if (pendingRestore) {
    container.dataset.restoreScroll = 'true';
  }

  const restoreScrollPosition = ({ scrollY, itemId }) => {
    const applyScroll = () => {
      const cardEl = itemId
        ? Array.from(container.querySelectorAll('[data-item-id]')).find(el => el.dataset.itemId === itemId)
        : null;

      if (cardEl) {
        cardEl.scrollIntoView({ block: 'center' });
        return;
      }

      if (Number.isFinite(scrollY)) {
        window.scrollTo(0, scrollY);
      }
    };

    applyScroll();
    requestAnimationFrame(applyScroll);
  };

  const loadData = async () => {
    const restoreTarget = pendingRestore;
    pendingRestore = null;

    if (restoreTarget) {
      const cached = getRouteState(HOME_ROUTE);
      if (cached?.data) {
        renderHome(cached.data);
        restoreScrollPosition(restoreTarget);
        return;
      }
    }

    container.innerHTML = '';
    setSectionBusy(container, true);
    container.appendChild(createSectionLoader({ label: 'Startseite wird geladen' }));

    try {
      const raw = await MediaApi.getHome();
      const data = {
        hero: shuffleArray([...(raw.movies || []), ...(raw.series || [])]).slice(0, 8),
        resume: raw.resume || [],
        sections: []
      };

      currentData = data;
      renderHome(data, { showSectionLoaders: true });
      saveRouteState(HOME_ROUTE, { data });
      loadSectionGroups();
    } catch (error) {
      if (error.isAuthError) return;

      console.error('[Home Page Load Error]', error);
      appStore.showToast('Fehler beim Laden der Startseite', 'error');
      renderError(error.message);
    } finally {
      setSectionBusy(container, false);
    }
  };

  const renderError = (msg) => {
    container.innerHTML = '';
    container.appendChild(
      createElement('div', { className: 'content-section' },
        createElement('div', { className: 'search-empty-state' },
          createElement('h3', {}, 'Verbindung fehlgeschlagen'),
          createElement('p', {}, msg || 'Der Jellyfin-Server konnte nicht erreicht werden.'),
          createElement('button', {
            className: 'btn-primary',
            onClick: loadData
          }, 'Erneut versuchen')
        )
      )
    );
  };

  const hasContent = (data) => {
    const hasHero = data.hero && data.hero.length > 0;
    const hasResume = data.resume && data.resume.length > 0;
    const hasSections = data.sections && data.sections.length > 0;
    return hasHero || hasResume || hasSections;
  };

  const renderGroupLoader = (group) => (
    createElement('div', {
      className: 'media-carousel-container media-section-loading',
      dataset: { homeSectionGroup: group.key }
    },
      createElement('div', { className: 'carousel-header' },
        createElement('h3', { className: 'carousel-title-text' }, group.title)
      ),
      createSectionLoader({ label: group.loadingLabel, compact: true })
    )
  );

  const renderEmptySection = (section) => (
    createElement('div', { className: 'media-carousel-container media-section-empty' },
      createElement('div', { className: 'carousel-header' },
        createElement('h3', { className: 'carousel-title-text' }, section.title)
      ),
      createElement('p', { className: 'section-empty-message' }, section.emptyMessage)
    )
  );

  const renderSection = (section) => {
    if (!section.items || section.items.length === 0) {
      return section.emptyMessage ? renderEmptySection(section) : null;
    }

    if (section.type === 'featured') {
      return FeaturedMediaCarousel({
        title: section.title,
        items: section.items,
        cardSize: section.cardSize || 'large'
      });
    }

    return MediaCarousel({
      title: section.title,
      items: section.items,
      landscape: false,
      href: section.href || null
    });
  };

  const saveCurrentData = () => {
    if (!currentData) return;
    const sections = HOME_SECTION_GROUPS.flatMap(group => sectionGroupResults.get(group.key) || []);
    currentData = { ...currentData, sections };
    saveRouteState(HOME_ROUTE, { data: currentData });
  };

  const replaceSectionGroup = (group, sections) => {
    const slot = sectionsContainer?.querySelector(`[data-home-section-group="${group.key}"]`);
    if (!slot) return;

    const renderedSections = sections
      .map(section => renderSection(section))
      .filter(Boolean);

    if (renderedSections.length === 0) {
      slot.remove();
      return;
    }

    slot.replaceWith(...renderedSections);
  };

  const loadSectionGroups = () => {
    HOME_SECTION_GROUPS.forEach(group => {
      MediaApi.getHomeSectionGroup(group.key)
        .then(result => {
          const sections = result.sections || [];
          sectionGroupResults.set(group.key, sections);
          replaceSectionGroup(group, sections);
          saveCurrentData();
        })
        .catch(error => {
          if (error.isAuthError) return;

          console.error(`[Home Section Group Error:${group.key}]`, error);
          const fallbackSections = [{
            type: 'standard',
            title: group.title,
            items: [],
            emptyMessage: 'Dieser Bereich konnte gerade nicht geladen werden.'
          }];

          sectionGroupResults.set(group.key, fallbackSections);
          replaceSectionGroup(group, fallbackSections);
          saveCurrentData();
        });
    });
  };

  const renderHome = (data, { showSectionLoaders = false } = {}) => {
    container.innerHTML = '';

    if (!showSectionLoaders && !hasContent(data)) {
      container.appendChild(
        createElement('div', { className: 'content-section' },
          createElement('div', { className: 'search-empty-state' },
            createElement('h3', {}, 'Keine Medien vorhanden'),
            createElement('p', {}, 'Auf deinem Jellyfin-Server wurden keine Medien gefunden.')
          )
        )
      );
      return;
    }

    const heroItems = data.hero || [];

    if (heroItems.length > 0) {
      const heroEl = HeroCarousel({ items: heroItems });
      if (heroEl) container.appendChild(heroEl);
    }

    sectionsContainer = createElement('div', { className: 'content-section' });

    if (data.resume && data.resume.length > 0) {
      const resumeCarousel = MediaCarousel({
        title: 'Weiter schauen',
        items: data.resume,
        landscape: true
      });
      if (resumeCarousel) sectionsContainer.appendChild(resumeCarousel);
    }

    if (data.sections) {
      data.sections.forEach(section => {
        const sectionEl = renderSection(section);
        if (sectionEl) sectionsContainer.appendChild(sectionEl);
      });
    }

    if (showSectionLoaders) {
      HOME_SECTION_GROUPS.forEach(group => {
        sectionsContainer.appendChild(renderGroupLoader(group));
      });
    }

    container.appendChild(sectionsContainer);
  };

  loadData();

  return container;
}
