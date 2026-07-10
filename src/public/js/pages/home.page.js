import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { FeaturedMediaCarousel } from '../components/featuredMediaCarousel.js';
import { HeroCarousel } from '../components/heroCarousel.js';
import { getRouteState, saveRouteState, consumeReturnMarker } from '../utils/routeState.js';

const HOME_ROUTE = '#/home';

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function HomePage() {
  const container = createElement('div', { className: 'page-container' });

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
      const raw = await MediaApi.getHomeSections();
      const data = { ...raw, hero: shuffleArray([...(raw.hero || [])]).slice(0, 8) };
      renderHome(data);
      saveRouteState(HOME_ROUTE, { data });
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

  const renderHome = (data) => {
    container.innerHTML = '';

    if (!hasContent(data)) {
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

    const sectionsContainer = createElement('div', { className: 'content-section' });

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
        if (!section.items || section.items.length === 0) return;

        if (section.type === 'featured') {
          const carousel = FeaturedMediaCarousel({
            title: section.title,
            items: section.items,
            cardSize: section.cardSize || 'large'
          });
          if (carousel) sectionsContainer.appendChild(carousel);
        } else {
          const carousel = MediaCarousel({
            title: section.title,
            items: section.items,
            landscape: false,
            href: section.href || null
          });
          if (carousel) sectionsContainer.appendChild(carousel);
        }
      });
    }

    container.appendChild(sectionsContainer);
  };

  loadData();

  return container;
}
