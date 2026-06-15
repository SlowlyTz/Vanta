import { router } from './router.js';

// Define routing mappings using dynamic ES modules imports
router.add('#/login', () => import('./pages/login.page.js'), { guestOnly: true });
router.add('#/home', () => import('./pages/home.page.js'), { requiresAuth: true });
router.add('#/movies', () => import('./pages/library.page.js'), { requiresAuth: true, defaultParams: { type: 'Movie' } });
router.add('#/series', () => import('./pages/library.page.js'), { requiresAuth: true, defaultParams: { type: 'Series' } });
router.add('#/genre/:type/:genreName', () => import('./pages/library.page.js'), { requiresAuth: true });
router.add('#/publishers', () => import('./pages/publishers.page.js'), { requiresAuth: true });
router.add('#/publisher/:studioName', () => import('./pages/library.page.js'), { requiresAuth: true, defaultParams: { type: 'Movie,Series' } });
router.add('#/search', () => import('./pages/search.page.js'), { requiresAuth: true });
router.add('#/requests', () => import('./pages/requests.page.js'), { requiresAuth: true });
router.add('#/seer-detail/:type/:id', () => import('./pages/seerDetail.page.js'), { requiresAuth: true });
router.add('#/item/:id', () => import('./pages/detail.page.js'), { requiresAuth: true });
router.add('#/player/:id', () => import('./pages/player.page.js'), { requiresAuth: true });

// Initialise client router on page load
document.addEventListener('DOMContentLoaded', () => {
  router.init();
});
