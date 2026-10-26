// Home page: hero, "Weiter schauen", "Meine Liste" and the server's section
// rows, restored from saved state on the way back, plus the idle screensaver.
import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { WatchlistApi } from '../api/watchlist.api.js';
import { watchlistStore } from '../store/watchlist.store.js';
import { hiddenResumeIds, removeCard } from '../components/mediaActions.js';
import { appStore } from '../store/app.store.js';
import { setSectionBusy } from '../components/loader.js';
import { createHeroSkeleton, createCarouselSkeleton } from '../components/skeleton.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { FeaturedMediaCarousel } from '../components/featuredMediaCarousel.js';
import { HeroCarousel } from '../components/heroCarousel.js';
import { getRouteState, saveRouteState, consumeReturnMarker } from '../utils/routeState.js';
import { resolvePageScope } from '../utils/pageScope.js';
import { EmptyState, ErrorState } from '../components/emptyState.js';
import { whenConnected } from '../utils/whenConnected.js';
import { preferencesStore } from '../store/preferences.store.js';
import { createIdleWatch, startScreensaver } from '../components/screensaver.js';
import { lastPlayerLeftAt } from '../utils/cardUserData.js';

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

// The hero is the most prominent spot: titles with a backdrop and a text
// first, the rest only when there are too few of them.
const HERO_SIZE = 8;
export function pickHeroItems(items) {
  const complete = items.filter(item => item.BackdropImageTags?.length && item.Overview);
  return shuffleArray(complete.length >= 3 ? complete : items).slice(0, HERO_SIZE);
}

export default function HomePage(params, pageScope) {
  const scope = resolvePageScope(pageScope);
  const { signal } = scope;
  const container = createElement('div', { className: 'page-container home-page', 'data-tv-backdrop': '' });
  container.dataset.edgeTop = 'true';
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

    whenConnected(container, () => {
      applyScroll();
      requestAnimationFrame(applyScroll);
    });
  };

  // The resume row of a home page shown from its saved state, swapped for
  // what the server says now; the focus stays on its title if it is still
  // there.
  const refreshResumeRow = async () => {
    let raw;
    try {
      raw = await MediaApi.getHome({ signal });
    } catch {
      return;
    }
    if (!currentData || !sectionsContainer?.isConnected) return;
    const resume = (raw.resume || []).filter(item => !hiddenResumeIds.has(item.Id));
    currentData = { ...currentData, resume };
    saveRouteState(HOME_ROUTE, { ...(getRouteState(HOME_ROUTE) || {}), data: currentData, savedAt: Date.now() });

    const old = sectionsContainer.querySelector('[data-resume-row]');
    const focusedId = old?.contains(document.activeElement) ? document.activeElement.closest('[data-item-id]')?.dataset.itemId : null;
    const fresh = resume.length > 0
      ? MediaCarousel({ title: 'Weiter schauen', items: resume, landscape: true, resumeRow: true })
      : null;
    if (old && fresh) old.replaceWith(fresh);
    else if (old) old.remove();
    else if (fresh) sectionsContainer.prepend(fresh);
    if (focusedId) {
      const target = fresh?.querySelector(`[data-item-id="${CSS.escape(focusedId)}"]`) || fresh?.querySelector('[data-item-id]');
      target?.focus({ preventScroll: true });
    }
  };

  const loadData = async () => {
    const restoreTarget = pendingRestore;
    pendingRestore = null;

    if (restoreTarget) {
      const cached = getRouteState(HOME_ROUTE);
      if (cached?.data) {
        // What changed meanwhile (taken out of "Weiter schauen", off the list)
        // stays out.
        const data = {
          ...cached.data,
          resume: (cached.data.resume || []).filter(item => !hiddenResumeIds.has(item.Id)),
          watchlist: (cached.data.watchlist || []).filter(item => !watchlistStore.isLoaded?.() || watchlistStore.has(item.Id))
        };
        currentData = data;
        saveRouteState(HOME_ROUTE, { ...cached, data });
        renderHome(data);
        restoreScrollPosition(restoreTarget);
        // Watched something since: "Weiter schauen" comes fresh.
        if (lastPlayerLeftAt() > (cached.savedAt || 0)) refreshResumeRow();
        return;
      }
    }

    container.innerHTML = '';
    setSectionBusy(container, true);
    container.appendChild(createHeroSkeleton());
    container.appendChild(
      createElement('div', { className: 'content-section' },
        createCarouselSkeleton({ title: 'Weiter schauen', landscape: true, count: 5, className: 'media-section-loading' }),
        HOME_SECTION_GROUPS.map(group => renderGroupLoader(group))
      )
    );

    try {
      // "Meine Liste" is a nicety: without it the page still loads.
      const [raw, watchlist] = await Promise.all([
        MediaApi.getHome({ signal }),
        WatchlistApi.list({ signal }).then(result => result.items || []).catch(() => [])
      ]);
      const data = {
        hero: pickHeroItems([...(raw.movies || []), ...(raw.series || [])]),
        resume: raw.resume || [],
        watchlist,
        sections: []
      };

      currentData = data;
      renderHome(data, { showSectionLoaders: true });
      saveRouteState(HOME_ROUTE, { data, savedAt: Date.now() });
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
        ErrorState({
          title: 'Verbindung fehlgeschlagen',
          message: msg || 'Der Jellyfin-Server konnte nicht erreicht werden.',
          retry: loadData
        })
      )
    );
  };

  const hasContent = (data) => {
    const hasHero = data.hero && data.hero.length > 0;
    const hasResume = (data.resume && data.resume.length > 0) || (data.watchlist && data.watchlist.length > 0);
    const hasSections = data.sections && data.sections.length > 0;
    return hasHero || hasResume || hasSections;
  };

  const renderGroupLoader = (group) => {
    const skeleton = createCarouselSkeleton({
      title: group.title,
      label: group.loadingLabel,
      featured: group.key === 'featured',
      className: 'media-section-loading'
    });
    skeleton.dataset.homeSectionGroup = group.key;
    return skeleton;
  };

  // A row without titles is left out instead of standing there empty.
  const renderSection = (section) => {
    if (!section.items || section.items.length === 0) return null;

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
    saveRouteState(HOME_ROUTE, { data: currentData, savedAt: getRouteState(HOME_ROUTE)?.savedAt || Date.now() });
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
      MediaApi.getHomeSectionGroup(group.key, { signal })
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
          EmptyState({ title: 'Keine Medien vorhanden', message: 'Auf deinem Jellyfin-Server wurden keine Medien gefunden.' })
        )
      );
      return;
    }

    const heroItems = data.hero || [];

    if (heroItems.length > 0) {
      const heroEl = HeroCarousel({ items: heroItems, pageScope: scope });
      if (heroEl) container.appendChild(heroEl);
    }

    sectionsContainer = createElement('div', { className: 'content-section' });

    if (data.resume && data.resume.length > 0) {
      const resumeCarousel = MediaCarousel({
        title: 'Weiter schauen',
        items: data.resume,
        landscape: true,
        resumeRow: true
      });
      if (resumeCarousel) sectionsContainer.appendChild(resumeCarousel);
    }

    if (data.watchlist && data.watchlist.length > 0) {
      const watchlistCarousel = MediaCarousel({
        title: 'Meine Liste',
        items: data.watchlist,
        landscape: false,
        href: '#/profile?tab=watchlist'
      });
      if (watchlistCarousel) {
        watchlistCarousel.dataset.watchlistRow = '';
        sectionsContainer.appendChild(watchlistCarousel);
      }
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

  // The screensaver after a while without input on this page (settings:
  // on/off and how long, applied as soon as they change). It never keeps
  // the device awake.
  const bindScreensaver = () => {
    let watch = null;
    let current = null;
    const apply = (prefs) => {
      const wanted = prefs.screensaverEnabled ? prefs.screensaverMinutes : null;
      if (wanted === current) return;
      current = wanted;
      watch?.stop();
      watch = null;
      if (!wanted) return;
      const idle = createIdleWatch({
        timeoutMs: wanted * 60 * 1000,
        onIdle: async () => {
          if (!container.isConnected || signal.aborted) return;
          idle.stop();
          const handle = await startScreensaver({
            pageScope: scope,
            onClose: () => {
              if (!signal.aborted && watch === idle) idle.start();
            }
          });
          if (!handle && !signal.aborted && watch === idle) idle.start();
        }
      });
      watch = idle;
      idle.start();
    };
    apply(preferencesStore.getState());
    const unsubscribe = preferencesStore.subscribe(apply);
    scope.onLeave(() => {
      unsubscribe?.();
      watch?.stop();
    });
  };

  // A title taken off "Meine Liste" (context menu, another tab) leaves its row.
  const unsubscribeWatchlist = watchlistStore.subscribe(({ ids }) => {
    if (!watchlistStore.isLoaded?.()) return;
    container.querySelectorAll('[data-watchlist-row] [data-item-id]').forEach(card => {
      if (!ids.has(card.dataset.itemId)) removeCard(card);
    });
  });
  scope.onLeave(() => unsubscribeWatchlist());

  loadData();
  bindScreensaver();

  return container;
}
