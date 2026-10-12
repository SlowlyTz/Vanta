import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { WatchlistApi } from '../api/watchlist.api.js';
import { watchlistStore } from '../store/watchlist.store.js';
import { removeCard } from '../components/mediaActions.js';
import { MediaCard } from '../components/mediaCard.js';
import { appStore } from '../store/app.store.js';
import { authStore } from '../store/auth.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { resolvePageScope } from '../utils/pageScope.js';
import { EmptyState, ErrorState } from '../components/emptyState.js';
import { PageHeading } from '../components/pageHeading.js';
import { createSettingsOverview } from '../components/navbar/settingsOverview.js';
import { createSettingsStatsLoader } from '../components/settings/settingsStats.js';

const LIMIT = 24;

const TABS = [
  {
    key: 'continue',
    label: 'Weiter schauen',
    load: (page, options) => MediaApi.getProfileContinueWatching(page, LIMIT, options),
    emptyText: 'Du hast aktuell keine begonnenen Inhalte.'
  },
  {
    key: 'watchlist',
    label: 'Meine Liste',
    // The whole list at once (it is short); newest first.
    load: async (page, options) => {
      const { items } = await WatchlistApi.list(options);
      return { items: items || [], page: 1, totalPages: 1 };
    },
    emptyText: 'Deine Liste ist leer. Merke dir Filme und Serien über „Meine Liste“ auf ihrer Detailseite.'
  },
  {
    key: 'history',
    label: 'Verlauf',
    load: (page, options) => MediaApi.getProfileHistory(page, LIMIT, options),
    emptyText: 'Du hast noch keine vollständig angesehenen Inhalte.'
  },
  {
    key: 'favorites',
    label: 'Favoriten',
    load: (page, options) => MediaApi.getProfileFavorites(page, LIMIT, options),
    emptyText: 'Du hast noch keine Favoriten markiert.'
  }
];

function createEmptyPageState() {
  return { items: [], page: 0, totalPages: 0, loading: false, loaded: false, error: null };
}

// Each tab has its address, so the navigation marks it and a reload keeps it.
const TAB_HASHES = { continue: '#/profile', watchlist: '#/watchlist', history: '#/profile?tab=history', favorites: '#/favorites' };

const tabFromHash = (hash) => {
  const [path, query = ''] = hash.split('?');
  if (path === '#/watchlist') return 'watchlist';
  if (path === '#/favorites') return 'favorites';
  if (path === '#/profile') return new URLSearchParams(query).get('tab') === 'history' ? 'history' : 'continue';
  return null;
};

export default function ProfilePage({ initialTab = 'continue' } = {}, pageScope) {
  const { signal } = resolvePageScope(pageScope);
  // "Verlauf" has no route of its own: #/profile?tab=history.
  if (initialTab === 'continue' && tabFromHash(window.location.hash || '') === 'history') initialTab = 'history';
  const container = createElement('div', { className: 'page-container content-section profile-page', 'data-tv-backdrop': '' });

  const validInitialTab = TABS.some(tab => tab.key === initialTab) ? initialTab : TABS[0].key;

  const state = {
    activeTab: validInitialTab,
    pages: {
      continue: createEmptyPageState(),
      watchlist: createEmptyPageState(),
      history: createEmptyPageState(),
      favorites: createEmptyPageState()
    }
  };

  const user = authStore.getState().user;
  const displayName = user?.name || user?.Name || user?.username || user?.Username || 'Username';

  const profileHeader = PageHeading({ title: 'Profil', subtitle: displayName });

  const tabButtons = new Map();
  const tabsNav = createElement('div', { className: 'profile-tabs', 'data-tv-row': '' });

  TABS.forEach(tab => {
    const button = createElement('button', {
      className: 'profile-tab-button',
      type: 'button',
      onClick: () => {
        setActiveTab(tab.key);
        // Without a new history entry; the router leaves the page standing.
        if (tabFromHash(window.location.hash || '') !== tab.key) window.location.replace(TAB_HASHES[tab.key]);
      }
    }, tab.label);
    tabButtons.set(tab.key, button);
    tabsNav.appendChild(button);
  });

  const contentEl = createElement('div', { className: 'profile-tab-content' });

  const renderTabButtons = () => {
    tabButtons.forEach((button, key) => {
      button.classList.toggle('active', key === state.activeTab);
    });
  };

  const renderTabContent = () => {
    const tab = TABS.find(t => t.key === state.activeTab);
    const tabState = state.pages[state.activeTab];

    contentEl.innerHTML = '';

    if (tabState.loading && tabState.items.length === 0) {
      contentEl.appendChild(createSectionLoader({ label: `${tab.label} wird geladen` }));
      return;
    }

    if (tabState.error) {
      contentEl.appendChild(
        ErrorState({ message: tabState.error, retry: () => loadTab(state.activeTab, 1, { append: false }) })
      );
      return;
    }

    if (tabState.loaded && tabState.items.length === 0) {
      contentEl.appendChild(
        EmptyState({ message: tab.emptyText })
      );
      return;
    }

    const grid = createElement('div', { className: 'library-grid' });
    if (state.activeTab === 'continue') grid.dataset.resumeRow = 'true';
    tabState.items.forEach(item => {
      const cardEl = MediaCard({ item, landscape: false, sourceType: 'profile' });
      if (cardEl) grid.appendChild(cardEl);
    });
    contentEl.appendChild(grid);

    if (tabState.page < tabState.totalPages) {
      const loadMoreBtn = createElement('button', {
        className: 'btn-secondary profile-load-more',
        type: 'button',
        disabled: tabState.loading,
        'aria-busy': tabState.loading ? 'true' : null,
        onClick: () => loadTab(state.activeTab, tabState.page + 1, { append: true })
      }, tabState.loading ? 'Lädt...' : 'Mehr laden');

      contentEl.appendChild(
        createElement('div', { className: 'profile-load-more-row' }, loadMoreBtn)
      );
    }
  };

  const loadTab = async (tabKey, page, { append } = { append: false }) => {
    const tabState = state.pages[tabKey];
    tabState.loading = true;
    tabState.error = null;
    setSectionBusy(contentEl, true);
    renderTabContent();

    try {
      const tab = TABS.find(t => t.key === tabKey);
      const result = await tab.load(page, { signal });
      tabState.items = append ? [...tabState.items, ...result.items] : result.items;
      tabState.page = result.page;
      tabState.totalPages = result.totalPages;
      tabState.loaded = true;
    } catch (error) {
      if (error.isAuthError) return;

      console.error('[Profile Page Load Error]', error);
      tabState.error = error.message || 'Die Inhalte konnten nicht geladen werden.';
      appStore.showToast('Fehler beim Laden des Profils', 'error');
    } finally {
      tabState.loading = false;
      if (tabKey === state.activeTab) {
        setSectionBusy(contentEl, false);
        renderTabContent();
      }
    }
  };

  const setActiveTab = (tabKey) => {
    state.activeTab = tabKey;
    renderTabButtons();

    const tabState = state.pages[tabKey];
    if (!tabState.loaded && !tabState.loading) {
      loadTab(tabKey, 1, { append: false });
    } else {
      renderTabContent();
    }
  };

  // What the user's libraries hold (moved here from the settings).
  const libraryStats = createSettingsOverview();
  libraryStats.element.classList.add('profile-library-stats');
  createSettingsStatsLoader(libraryStats).load();

  container.appendChild(profileHeader);
  container.appendChild(libraryStats.element);
  container.appendChild(tabsNav);
  container.appendChild(contentEl);

  setActiveTab(state.activeTab);

  // A title taken off the list (context menu) leaves the "Meine Liste" tab.
  const unsubscribeWatchlist = watchlistStore.subscribe(({ ids }) => {
    if (!watchlistStore.isLoaded()) return;
    const listState = state.pages.watchlist;
    const kept = listState.items.filter(item => ids.has(item.Id));
    if (kept.length === listState.items.length) return;
    listState.items = kept;
    if (state.activeTab === 'watchlist') {
      contentEl.querySelectorAll('[data-item-id]').forEach(card => {
        if (!ids.has(card.dataset.itemId)) removeCard(card);
      });
      if (!kept.length) window.setTimeout(renderTabContent, 280);
    }
  });
  resolvePageScope(pageScope).onLeave(() => unsubscribeWatchlist());

  // A change between the profile's own addresses stays on this page.
  container.handleHashChange = (hash) => {
    const tab = tabFromHash(hash);
    if (!tab) return false;
    if (tab !== state.activeTab) setActiveTab(tab);
    return true;
  };

  return container;
}
