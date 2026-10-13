import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { WatchlistApi } from '../api/watchlist.api.js';
import { watchlistStore } from '../store/watchlist.store.js';
import { removeCard } from '../components/mediaActions.js';
import { MediaCard } from '../components/mediaCard.js';
import { MediaCarousel } from '../components/mediaCarousel.js';
import { appStore } from '../store/app.store.js';
import { authStore } from '../store/auth.store.js';
import { createSectionLoader, setSectionBusy } from '../components/loader.js';
import { createCarouselSkeleton } from '../components/skeleton.js';
import { resolvePageScope } from '../utils/pageScope.js';
import { EmptyState, ErrorState } from '../components/emptyState.js';
import { getBackdropUrlFor } from '../utils/image.js';

// The profile: a head with what one has watched, then a row for each of
// one's lists (#/profile). Each list also opens whole, as a grid with a
// switch between the lists: #/profile?tab=continue, #/watchlist,
// #/profile?tab=history and #/favorites.

const LIMIT = 24;
const ROW_LIMIT = 20;

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
    hash: '#/watchlist',
    // The whole list at once (it is short); newest first.
    load: async (page, limit, options) => {
      const { items } = await WatchlistApi.list(options);
      return { items: items || [], page: 1, totalPages: 1 };
    },
    emptyText: 'Deine Liste ist leer. Merke dir Filme und Serien über „Meine Liste“ auf ihrer Detailseite.'
  },
  {
    key: 'favorites',
    label: 'Favoriten',
    hash: '#/favorites',
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

// Which view an address shows: 'overview', a list's key, or null when it is
// not the profile's.
export const viewFromHash = (hash) => {
  const [path, query = ''] = hash.split('?');
  if (path === '#/watchlist') return 'watchlist';
  if (path === '#/favorites') return 'favorites';
  if (path !== '#/profile') return null;
  const tab = new URLSearchParams(query).get('tab');
  return tab === 'history' || tab === 'continue' ? tab : 'overview';
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
// the numbers; its links lead to each whole list.
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

  const shortcuts = createElement('nav', { className: 'profile-shortcuts', 'aria-label': 'Deine Listen', 'data-tv-row': '' },
    ...LISTS.map(list => createElement('a', {
      className: 'profile-shortcut',
      href: list.hash
    }, list.label))
  );

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
      last,
      shortcuts
    )
  );

  MediaApi.getProfileStats({ signal }).then(data => {
    stats.movies.value.textContent = formatCount(data.movies);
    stats.episodes.value.textContent = formatCount(data.episodes);
    stats.series.value.textContent = formatCount(data.series);
    stats.time.value.textContent = formatWatchTime(data.minutes);
    if (data.topGenres?.length) {
      genres.textContent = `Am liebsten: ${data.topGenres.join(' · ')}`;
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

// #/profile: the head and a row per list; empty lists leave no row.
function renderOverview(container, { signal }) {
  const rows = createElement('div', { className: 'content-section profile-rows' });
  const empty = EmptyState({
    title: 'Noch ganz leer hier',
    message: 'Was du anfängst, dir merkst oder als Favorit markierst, erscheint hier.',
    action: { label: 'Entdecken', onClick: () => { window.location.hash = '#/home'; } },
    className: 'profile-empty'
  });
  empty.hidden = true;

  let pending = LISTS.length;
  let shown = 0;
  const settle = () => {
    pending -= 1;
    if (pending === 0 && shown === 0) empty.hidden = false;
  };

  const loadRow = (list, slot) => {
    list.load(1, ROW_LIMIT, { signal }).then(({ items = [] }) => {
      const row = items.length
        ? MediaCarousel({ title: list.label, items, landscape: Boolean(list.landscape), href: list.hash, resumeRow: list.key === 'continue' })
        : null;
      if (row && list.key === 'watchlist') row.dataset.watchlistRow = '';
      if (row) {
        row.dataset.profileList = list.key;
        shown += 1;
        slot.replaceWith(row);
      } else {
        slot.remove();
      }
    }).catch(error => {
      if (error?.isAuthError || error?.name === 'AbortError') return;
      console.error('[Profile Row Load Error]', error);
      const failed = ErrorState({ title: list.label, message: 'Konnte nicht geladen werden.', retry: () => {
        const again = createCarouselSkeleton({ title: list.label, landscape: Boolean(list.landscape), count: 6 });
        failed.replaceWith(again);
        pending += 1;
        loadRow(list, again);
      } });
      failed.classList.add('profile-row-error');
      shown += 1;
      slot.replaceWith(failed);
    }).finally(settle);
  };

  LISTS.forEach(list => {
    const slot = createCarouselSkeleton({ title: list.label, landscape: Boolean(list.landscape), count: 6 });
    rows.appendChild(slot);
    loadRow(list, slot);
  });
  rows.appendChild(empty);
  container.appendChild(rows);
}

// A whole list as a grid, with the switch between the lists above it.
function renderList(container, { signal, initial }) {
  const state = { activeTab: initial, pages: {} };
  LISTS.forEach(list => { state.pages[list.key] = createEmptyPageState(); });

  const title = createElement('h2', { className: 'profile-list-title' });
  const count = createElement('span', { className: 'profile-list-count' });
  const tabButtons = new Map();
  const tabsNav = createElement('div', { className: 'profile-tabs', role: 'tablist', 'data-tv-row': '' });
  LISTS.forEach(list => {
    const button = createElement('button', {
      className: 'profile-tab-button',
      type: 'button',
      role: 'tab',
      onClick: () => {
        setActiveTab(list.key);
        // Without a new history entry; the router leaves the page standing.
        if (viewFromHash(window.location.hash || '') !== list.key) window.location.replace(list.hash);
      }
    }, list.label);
    tabButtons.set(list.key, button);
    tabsNav.appendChild(button);
  });

  const contentEl = createElement('div', { className: 'profile-tab-content' });

  const renderTabButtons = () => {
    tabButtons.forEach((button, key) => {
      const active = key === state.activeTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      // On a TV the list opens on its own tab.
      if (active) button.setAttribute('data-tv-autofocus', '');
      else button.removeAttribute('data-tv-autofocus');
    });
    title.textContent = listOf(state.activeTab).label;
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
    contentEl.innerHTML = '';
    count.textContent = tabState.loaded && tabState.items.length ? formatCount(tabState.items.length) + (tabState.page < tabState.totalPages ? '+' : '') : '';

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
    renderTabButtons();
    const tabState = state.pages[tabKey];
    if (!tabState.loaded && !tabState.loading) {
      loadTab(tabKey, 1, { append: false });
    } else {
      renderTabContent();
    }
  };

  container.appendChild(createElement('div', { className: 'content-section profile-list' },
    createElement('div', { className: 'profile-list-head' },
      createElement('a', { className: 'profile-back', href: '#/profile' }, '‹ Profil'),
      createElement('div', { className: 'profile-list-heading' }, title, count)
    ),
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
  const view = initialTab && listOf(initialTab) ? initialTab : (fromHash && fromHash !== 'overview' && !initialTab ? fromHash : 'overview');

  const container = createElement('div', { className: `page-container profile-page ${view === 'overview' ? 'profile-overview' : 'profile-list-view'}`, 'data-tv-backdrop': '' });

  let list = null;
  if (view === 'overview') {
    // The head runs up under the navbar.
    container.dataset.edgeTop = 'true';
    container.appendChild(ProfileHero({ user: authStore.getState().user, signal }));
    renderOverview(container, { signal });
  } else {
    list = renderList(container, { signal, initial: view });
  }

  const unsubscribeWatchlist = watchlistStore.subscribe(({ ids }) => {
    if (!watchlistStore.isLoaded()) return;
    if (list) {
      list.syncWatchlist(ids);
      return;
    }
    container.querySelectorAll('[data-watchlist-row] [data-item-id]').forEach(card => {
      if (!ids.has(card.dataset.itemId)) removeCard(card);
    });
  });
  scope.onLeave(() => unsubscribeWatchlist());

  // Between two lists the page stays and switches; to or from the overview
  // the router builds it anew.
  container.handleHashChange = (hash) => {
    const next = viewFromHash(hash);
    if (!next) return false;
    if (!list) return next === 'overview';
    if (next === 'overview') return false;
    if (next !== list.state.activeTab) list.setActiveTab(next);
    return true;
  };

  return container;
}
