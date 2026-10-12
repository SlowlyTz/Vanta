import { router } from './router.js';
import { initAppRealtime } from './realtime/app-realtime.js';
import { mountWatchPartyInvitationOverlay } from './components/watch-party/WatchPartyInvitationOverlay.js';
import { mountOfflineOverlay } from './components/offlineOverlay.js';
import { mountUpdateOverlay } from './components/updateOverlay.js';
import { registerServiceWorker } from './utils/service-worker.js';
import { initDetailPrefetch } from './utils/prefetch.js';
import { initMediaActions } from './components/mediaActions.js';
import { applyTvUrlOverride, isTvMode, markTvSuggested, setTvChoice, shouldSuggestTvMode } from './utils/tvMode.js';

// Define routing mappings using dynamic ES modules imports
router.add('#/login', () => import('./pages/login.page.js'), { styles: ['login'], guestOnly: true });
router.add('#/home', () => import('./pages/home.page.js'), { requiresAuth: true });
router.add('#/movies', () => import('./pages/library.page.js'), { requiresAuth: true, defaultParams: { type: 'Movie' } });
router.add('#/series', () => import('./pages/library.page.js'), { requiresAuth: true, defaultParams: { type: 'Series' } });
router.add('#/scroller', () => import('./pages/trailer-scroller.page.js'), { styles: ['trailer-scroller'], requiresAuth: true });
router.add('#/genre/:type/:genreName', () => import('./pages/library.page.js'), { requiresAuth: true });
router.add('#/publishers', () => import('./pages/publishers.page.js'), { styles: ['publishers'], requiresAuth: true });
router.add('#/publisher-group/:publisherId', () => import('./pages/library.page.js'), { requiresAuth: true, defaultParams: { type: 'Movie,Series' } });
router.add('#/publisher/:studioName', () => import('./pages/library.page.js'), { requiresAuth: true, defaultParams: { type: 'Movie,Series' } });
router.add('#/search', () => import('./pages/search.page.js'), { requiresAuth: true });
router.add('#/requests', () => import('./pages/requests.page.js'), { styles: ['requests'], requiresAuth: true });
router.add('#/requests/new', () => import('./pages/requests.page.js'), { styles: ['requests'], requiresAuth: true, defaultParams: { view: 'new' } });
router.add('#/requests/mine', () => import('./pages/requests.page.js'), { styles: ['requests'], requiresAuth: true, defaultParams: { view: 'list' } });
router.add('#/report', () => import('./pages/report.page.js'), { styles: ['requests'], requiresAuth: true });
router.add('#/report/mine', () => import('./pages/report.page.js'), { styles: ['requests'], requiresAuth: true, defaultParams: { view: 'mine' } });
router.add('#/request-detail/:type/:id', () => import('./pages/request-detail.page.js'), { styles: ['requests'], requiresAuth: true });
router.add('#/admin', () => import('./pages/admin.page.js'), { styles: ['admin'], requiresAuth: true });
router.add('#/admin/requests', () => import('./pages/admin.page.js'), { styles: ['admin'], requiresAuth: true, defaultParams: { section: 'requests' } });
router.add('#/admin/users', () => import('./pages/admin.page.js'), { styles: ['admin'], requiresAuth: true, defaultParams: { section: 'users' } });
router.add('#/admin/settings', () => import('./pages/admin.page.js'), { styles: ['admin'], requiresAuth: true, defaultParams: { section: 'settings' } });
router.add('#/connect', () => import('./pages/connect.page.js'), { styles: ['login'], requiresAuth: true });
router.add('#/item/:id', () => import('./pages/detail.page.js'), { requiresAuth: true });
router.add('#/profile', () => import('./pages/profile.page.js'), { styles: ['profile'], requiresAuth: true });
router.add('#/watchlist', () => import('./pages/profile.page.js'), { styles: ['profile'], requiresAuth: true, defaultParams: { initialTab: 'watchlist' } });
router.add('#/favorites', () => import('./pages/profile.page.js'), { styles: ['profile'], requiresAuth: true, defaultParams: { initialTab: 'favorites' } });
router.add('#/player/:id', () => import('./pages/player.page.js'), { styles: ['player'], requiresAuth: true });
router.add('#/watch-party/:partyId', () => import('./pages/watch-party.page.js'), { styles: ['watch-party', 'player'], requiresAuth: true });

// The skip link must not change the hash (the router would take it for a
// route); it moves focus to the page itself.
function bindSkipLink() {
  document.querySelector('.skip-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: false });
  });
}

// A screen that looks like a TV but was not recognised for sure is asked
// once; the answer is kept.
async function suggestTvMode() {
  if (!shouldSuggestTvMode()) return;
  markTvSuggested();
  const { confirmDialog } = await import('./components/confirmDialog.js');
  const yes = await confirmDialog({
    title: 'Fernseher erkannt?',
    message: 'Sieht nach einem Fernseher aus. TV-Modus aktivieren? Du kannst das jederzeit in den Einstellungen unter „Darstellung“ ändern.',
    confirmLabel: 'TV-Modus an',
    cancelLabel: 'Nein'
  });
  if (!yes) return;
  setTvChoice('on');
  window.location.reload();
}

// Initialise client router on page load
document.addEventListener('DOMContentLoaded', () => {
  applyTvUrlOverride();
  const tv = isTvMode();
  if (tv) {
    import('./tv/index.js').then(module => module.startTvMode({
      sidebar: { isOpen: () => router.tvSidebar?.isOpen() === true, close: () => router.tvSidebar?.close() }
    }));
  }
  bindSkipLink();
  mountWatchPartyInvitationOverlay();
  mountOfflineOverlay();
  mountUpdateOverlay();
  registerServiceWorker();
  initAppRealtime();
  router.init();
  initDetailPrefetch();
  initMediaActions();
  if (!tv) window.setTimeout(suggestTvMode, 3000);
});
