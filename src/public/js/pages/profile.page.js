import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { MediaCard } from '../components/mediaCard.js';
import { appStore } from '../store/app.store.js';
import { authStore } from '../store/auth.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';

const LIMIT = 24;

const TABS = [
  {
    key: 'continue',
    label: 'Weiter ansehen',
    load: (page) => MediaApi.getProfileContinueWatching(page, LIMIT),
    emptyText: 'Du hast aktuell keine begonnenen Inhalte.'
  },
  {
    key: 'history',
    label: 'History',
    load: (page) => MediaApi.getProfileHistory(page, LIMIT),
    emptyText: 'Du hast noch keine vollständig angesehenen Inhalte.'
  },
  {
    key: 'favorites',
    label: 'Favoriten',
    load: (page) => MediaApi.getProfileFavorites(page, LIMIT),
    emptyText: 'Du hast noch keine Favoriten markiert.'
  }
];

function createEmptyPageState() {
  return { items: [], page: 0, totalPages: 0, loading: false, loaded: false, error: null };
}

export default function ProfilePage() {
  const container = createElement('div', { className: 'page-container content-section profile-page' });

  const state = {
    activeTab: TABS[0].key,
    pages: {
      continue: createEmptyPageState(),
      history: createEmptyPageState(),
      favorites: createEmptyPageState()
    }
  };

  const user = authStore.getState().user;
  const displayName = user?.name || user?.Name || user?.username || user?.Username || 'Username';

  const profileHeader = createElement('div', { className: 'profile-header' },
    createElement('h1', { className: 'profile-title' }, 'Profil'),
    createElement('p', { className: 'profile-username' }, displayName)
  );

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
        createElement('div', { className: 'search-empty-state' },
          createElement('h3', {}, 'Fehler beim Laden'),
          createElement('p', {}, tabState.error),
          createElement('button', {
            className: 'btn-primary',
            onClick: () => loadTab(state.activeTab, 1, { append: false })
          }, 'Erneut versuchen')
        )
      );
      return;
    }

    if (tabState.loaded && tabState.items.length === 0) {
      contentEl.appendChild(
        createElement('div', { className: 'search-empty-state' },
          createElement('p', {}, tab.emptyText)
        )
      );
      return;
    }

    const grid = createElement('div', { className: 'library-grid' });
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
      const result = await tab.load(page);
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
