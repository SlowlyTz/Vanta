// Profile page: watch stats, then the user's lists as tabs. The tab lives in the
// address (#/profile?tab=…) and is remembered; #/watchlist and #/favorites are aliases.
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
import { getBackdropUrlFor } from '../utils/image.js';
import { genreLabel } from '../shared/genreLabels.js';

const LIMIT = 24;
const TAB_KEY = 'vanta.profile.tab';

const LISTS = [
  {
    key: 'continue',
    label: 'Weiter schauen',
    hash: '#/profile?tab=continue',
    landscape: true,
    load: (page, limit, options) => MediaApi.getProfileContinueWatching(page, limit, options),
    emptyText: 'Du hast aktuell keine begonnenen Inhalte.'
  },
  {
    key: 'watchlist',
    label: 'Meine Liste',
    hash: '#/profile?tab=watchlist',
    // The whole list at once (it is short); newest first.
    load: async (page, limit, options) => {
      const { items } = await WatchlistApi.list(options);
      return { items: items || [], page: 1, totalPages: 1 };
    },
    emptyText: 'Deine Liste ist leer. Merke dir Filme und Serien mit dem Lesezeichen-Symbol auf ihrer Detailseite.'
  },
  {
    key: 'favorites',
    label: 'Favoriten',
    hash: '#/profile?tab=favorites',
    load: (page, limit, options) => MediaApi.getProfileFavorites(page, limit, options),
    emptyText: 'Du hast noch keine Favoriten markiert.'
  },
  {
    key: 'history',
    label: 'Verlauf',
    hash: '#/profile?tab=history',
    load: (page, limit, options) => MediaApi.getProfileHistory(page, limit, options),
    emptyText: 'Du hast noch keine vollständig angesehenen Inhalte.'
  }
];

const listOf = key => LISTS.find(list => list.key === key);

// Which tab an address shows: a list's key, '' for the profile without one
// (the last tab chosen), or null when it is not the profile's.
export const viewFromHash = (hash) => {
  const [path, query = ''] = hash.split('?');
  if (path === '#/watchlist') return 'watchlist';
  if (path === '#/favorites') return 'favorites';
  if (path !== '#/profile') return null;
  const tab = new URLSearchParams(query).get('tab');
  return listOf(tab) ? tab : '';
};

const rememberedTab = () => {
  try {
    const key = localStorage.getItem(TAB_KEY);
    return listOf(key) ? key : 'continue';
  } catch {
    return 'continue';
  }
};
const rememberTab = key => {
  try { localStorage.setItem(TAB_KEY, key); } catch { /* private mode */ }
};

const formatCount = value => (Number.isFinite(value) ? new Intl.NumberFormat('de-DE').format(value) : '–');

// "45 Min.", "128 Std.", "52 Tage".
export function formatWatchTime(minutes) {
  if (!Number.isFinite(minutes)) return '–';
  if (minutes < 60) return `${Math.round(minutes)} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 1000) return `${formatCount(hours)} Std.`;
  return `${formatCount(Math.round(minutes / 1440))} Tage`;
}

function createEmptyPageState() {
  return { items: [], page: 0, totalPages: 0, loading: false, loaded: false, error: null };
}

// The head: the last title one watched behind it, the initial, the name and
// the numbers.
function ProfileHero({ user, signal }) {
  const name = user?.name || user?.Name || user?.username || user?.Username || 'Profil';
  const backdrop = createElement('div', { className: 'profile-hero-backdrop', 'aria-hidden': 'true' });

  const stat = (label) => {
    const value = createElement('span', { className: 'profile-stat-value' }, '–');
    return { value, element: createElement('div', { className: 'profile-stat' }, value, createElement('span', { className: 'profile-stat-label' }, label)) };
  };
  const stats = {
    movies: stat('Filme gesehen'),
    episodes: stat('Folgen gesehen'),
    series: stat('Serien'),
    time: stat('Geschaut')
  };
  const statsEl = createElement('div', { className: 'profile-stats is-loading' }, ...Object.values(stats).map(entry => entry.element));
  const genres = createElement('p', { className: 'profile-genres', hidden: true });
  const last = createElement('p', { className: 'profile-last', hidden: true });

  const element = createElement('section', { className: 'profile-hero' },
    backdrop,
    createElement('div', { className: 'profile-hero-inner' },
      createElement('div', { className: 'profile-identity' },
        createElement('span', { className: 'profile-avatar', 'aria-hidden': 'true' }, (String(name).trim().charAt(0) || '?').toUpperCase()),
        createElement('div', { className: 'profile-identity-copy' },
          createElement('span', { className: 'profile-role' }, user?.isAdmin ? 'Administrator' : 'Mitglied'),
          createElement('h1', { className: 'profile-name' }, name),
          genres
        )
      ),
      statsEl,
      last
    )
  );

  MediaApi.getProfileStats({ signal }).then(data => {
    stats.movies.value.textContent = formatCount(data.movies);
    stats.episodes.value.textContent = formatCount(data.episodes);
    stats.series.value.textContent = formatCount(data.series);
    stats.time.value.textContent = formatWatchTime(data.minutes);
    if (data.topGenres?.length) {
      genres.textContent = `Am liebsten: ${data.topGenres.map(genreLabel).join(' · ')}`;
      genres.hidden = false;
    }
    if (data.lastWatched?.Name) {
      last.textContent = `Zuletzt gesehen: ${data.lastWatched.Name}`;
      last.hidden = false;
      const url = getBackdropUrlFor(data.lastWatched);
      if (url && !url.startsWith('data:')) {
        const image = createElement('img', { alt: '', decoding: 'async' });
        image.addEventListener('load', () => backdrop.classList.add('is-loaded'), { once: true });
        image.src = url;
        backdrop.appendChild(image);
      }
    }
  }).catch(error => {
    if (error?.name !== 'AbortError') console.warn('[Profile] stats not loaded:', error?.message);
  }).finally(() => statsEl.classList.remove('is-loading'));

  return element;
}

// The lists: the tabs, and the chosen one whole as a grid below them.
function renderList(container, { signal, initial }) {
  const state = { activeTab: initial, pages: {} };
  LISTS.forEach(list => { state.pages[list.key] = createEmptyPageState(); });

  const tabButtons = new Map();
  const tv = document.documentElement.classList.contains('tv-mode');
  const tabsNav = createElement('div', { className: 'profile-tabs', role: 'tablist', 'aria-label': 'Listen', 'data-tv-row': '', 'data-tv-remember': '' });
  LISTS.forEach(list => {
    const button = createElement('button', {
      className: 'profile-tab-button',
      type: 'button',
      role: 'tab',
      id: `profile-tab-${list.key}`,
      'aria-controls': 'profile-tab-panel',
      onClick: () => {
        setActiveTab(list.key);
        // Without a new history entry; the router leaves the page standing.
        if (viewFromHash(window.location.hash || '') !== list.key) window.location.replace(list.hash);
      }
    }, list.label);
    tabButtons.set(list.key, button);
    tabsNav.appendChild(button);
  });

  const contentEl = createElement('div', { className: 'profile-tab-content', id: 'profile-tab-panel', role: 'tabpanel' });

  // Keyboard: one tab stop for the row, arrows (Home/End) choose the tab.
  // A TV's focus engine moves along the row itself.
  if (!tv) {
    tabsNav.addEventListener('keydown', event => {
      const keys = LISTS.map(list => list.key);
      const index = keys.indexOf(state.activeTab);
      const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: keys.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      const key = keys[(next + keys.length) % keys.length];
      tabButtons.get(key).click();
      tabButtons.get(key).focus();
    });
  }

  const renderTabButtons = () => {
    tabButtons.forEach((button, key) => {
      const active = key === state.activeTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      if (!tv) button.tabIndex = active ? 0 : -1;
      // On a TV the list opens on its own tab.
      if (active) button.setAttribute('data-tv-autofocus', '');
      else button.removeAttribute('data-tv-autofocus');
    });
    // On a phone the pills scroll sideways: the chosen one comes into view.
    const active = tabButtons.get(state.activeTab);
    window.requestAnimationFrame(() => {
      const left = active.offsetLeft;
      const right = left + active.offsetWidth;
      if (left < tabsNav.scrollLeft || right > tabsNav.scrollLeft + tabsNav.clientWidth) tabsNav.scrollLeft = Math.max(0, left - 14);
    });
  };

  const renderTabContent = () => {
    const list = listOf(state.activeTab);
    const tabState = state.pages[state.activeTab];
    contentEl.setAttribute('aria-labelledby', `profile-tab-${state.activeTab}`);
    contentEl.innerHTML = '';

    if (tabState.loading && tabState.items.length === 0) {
      contentEl.appendChild(createSectionLoader({ label: `${list.label} wird geladen` }));
      return;
    }
    if (tabState.error) {
      contentEl.appendChild(ErrorState({ message: tabState.error, retry: () => loadTab(state.activeTab, 1, { append: false }) }));
      return;
    }
    if (tabState.loaded && tabState.items.length === 0) {
      contentEl.appendChild(EmptyState({ message: list.emptyText }));
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
      contentEl.appendChild(createElement('div', { className: 'profile-load-more-row' }, loadMoreBtn));
    }
  };

  const loadTab = async (tabKey, page, { append } = { append: false }) => {
    const tabState = state.pages[tabKey];
    tabState.loading = true;
    tabState.error = null;
    setSectionBusy(contentEl, true);
    renderTabContent();

    try {
      const result = await listOf(tabKey).load(page, LIMIT, { signal });
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
    rememberTab(tabKey);
    renderTabButtons();
    const tabState = state.pages[tabKey];
    if (!tabState.loaded && !tabState.loading) {
      loadTab(tabKey, 1, { append: false });
    } else {
      renderTabContent();
    }
  };

  container.appendChild(createElement('section', { className: 'content-section profile-list', 'aria-label': 'Deine Listen' },
    tabsNav,
    contentEl
  ));
  setActiveTab(state.activeTab);

  return {
    state,
    setActiveTab,
    // A title taken off the list (context menu) leaves the "Meine Liste" tab.
    syncWatchlist(ids) {
      const listState = state.pages.watchlist;
      const kept = listState.items.filter(item => ids.has(item.Id));
      if (kept.length === listState.items.length) return;
      listState.items = kept;
      if (state.activeTab !== 'watchlist') return;
      contentEl.querySelectorAll('[data-item-id]').forEach(card => {
        if (!ids.has(card.dataset.itemId)) removeCard(card);
      });
      if (!kept.length) window.setTimeout(renderTabContent, 280);
    }
  };
}

export default function ProfilePage({ initialTab = null } = {}, pageScope) {
  const scope = resolvePageScope(pageScope);
  const { signal } = scope;
  const fromHash = viewFromHash(window.location.hash || '');
  const tab = listOf(initialTab) ? initialTab : (fromHash || rememberedTab());
  // The old addresses of the lists (#/watchlist, #/favorites) and the plain
  // profile show the tab's own address.
  const wanted = listOf(tab).hash;
  if (window.location.hash !== wanted && fromHash !== null) window.history.replaceState(window.history.state, '', wanted);

  const container = createElement('div', { className: 'page-container profile-page', 'data-tv-backdrop': '' });
  // The head runs up under the navbar.
  container.dataset.edgeTop = 'true';
  container.appendChild(ProfileHero({ user: authStore.getState().user, signal }));
  const list = renderList(container, { signal, initial: tab });

  const unsubscribeWatchlist = watchlistStore.subscribe(({ ids }) => {
    if (watchlistStore.isLoaded()) list.syncWatchlist(ids);
  });
  scope.onLeave(() => unsubscribeWatchlist());

  // Between the tabs the page stays and switches.
  container.handleHashChange = (hash) => {
    const next = viewFromHash(hash);
    if (next === null) return false;
    const key = next || list.state.activeTab;
    if (key !== list.state.activeTab) list.setActiveTab(key);
    if (hash !== listOf(key).hash) window.history.replaceState(window.history.state, '', listOf(key).hash);
    return true;
  };

  return container;
}
