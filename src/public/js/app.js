import { router } from './router.js';

// Define routing mappings using dynamic ES modules imports
router.add('#/login', () => import('./pages/login.page.js'), { guestOnly: true });
router.add('#/home', () => import('./pages/home.page.js'), { requiresAuth: true });
router.add('#/movies', () => import('./pages/library.page.js'), { requiresAuth: true, defaultParams: { type: 'Movie' } });
router.add('#/series', () => import('./pages/library.page.js'), { requiresAuth: true, defaultParams: { type: 'Series' } });
router.add('#/scroller', () => import('./pages/trailer-scroller.page.js'), { requiresAuth: true });
router.add('#/genre/:type/:genreName', () => import('./pages/library.page.js'), { requiresAuth: true });
router.add('#/publishers', () => import('./pages/publishers.page.js'), { requiresAuth: true });
router.add('#/publisher-group/:publisherId', () => import('./pages/library.page.js'), { requiresAuth: true, defaultParams: { type: 'Movie,Series' } });
router.add('#/publisher/:studioName', () => import('./pages/library.page.js'), { requiresAuth: true, defaultParams: { type: 'Movie,Series' } });
router.add('#/search', () => import('./pages/search.page.js'), { requiresAuth: true });
router.add('#/requests', () => import('./pages/requests.page.js'), { requiresAuth: true });
router.add('#/requests/new', () => import('./pages/requests.page.js'), { requiresAuth: true, defaultParams: { view: 'new' } });
router.add('#/requests/mine', () => import('./pages/requests.page.js'), { requiresAuth: true, defaultParams: { view: 'list' } });
router.add('#/request-detail/:type/:id', () => import('./pages/request-detail.page.js'), { requiresAuth: true });
router.add('#/item/:id', () => import('./pages/detail.page.js'), { requiresAuth: true });
router.add('#/profile', () => import('./pages/profile.page.js'), { requiresAuth: true });
router.add('#/favorites', () => import('./pages/profile.page.js'), { requiresAuth: true, defaultParams: { initialTab: 'favorites' } });
router.add('#/player/:id', () => import('./pages/player.page.js'), { requiresAuth: true });
router.add('#/watch-party/:partyId', () => import('./pages/watch-party.page.js'), { requiresAuth: true });

// Initialise client router on page load
document.addEventListener('DOMContentLoaded', () => {
  router.init();
});
