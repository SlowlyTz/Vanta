import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { WatchlistApi } from '../api/watchlist.api.js';
import { MediaCard } from '../components/mediaCard.js';
import { appStore } from '../store/app.store.js';
import { authStore } from '../store/auth.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { resolvePageScope } from '../utils/pageScope.js';
import { EmptyState, ErrorState } from '../components/emptyState.js';
import { PageHeading } from '../components/pageHeading.js';

const LIMIT = 24;

const TABS = [
  {
    key: 'continue',
    label: 'Weiter ansehen',
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
    label: 'History',
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

export default function ProfilePage({ initialTab = 'continue' } = {}, pageScope) {
  const { signal } = resolvePageScope(pageScope);
  const container = createElement('div', { className: 'page-container content-section profile-page' });

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
  const tabsNav = createElement('div', { className: 'profile-tabs' });

  TABS.forEach(tab => {
    const button = createElement('button', {
      className: 'profile-tab-button',
      type: 'button',
      onClick: () => setActiveTab(tab.key)
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

  container.appendChild(profileHeader);
  container.appendChild(tabsNav);
  container.appendChild(contentEl);

  setActiveTab(state.activeTab);

  return container;
}
