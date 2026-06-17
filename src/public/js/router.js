import { authStore } from './store/auth.store.js';
import { createElement } from './utils/dom.js';
import { Navbar } from './components/navbar.js';
import { Footer } from './components/footer.js';

class Router {
  constructor() {
    this.routes = [];
    this.appContainer = document.getElementById('app');
    this.shell = null;
    this.navbar = null;
    this.main = null;
    this.unsubscribeAuth = null;
  }

  add(path, pageLoader, options = {}) {
    this.routes.push({ path, pageLoader, ...options });
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('scroll', () => this.updateShellState());

    this.unsubscribeAuth = authStore.subscribe(({ user }) => {
      this.updateShellState(window.location.hash || '#/home', user);
    });

    this.handleRoute();
  }

  ensureShell() {
    if (this.shell) return;

    this.navbar = Navbar({
      onLogout: () => authStore.logout(),
      onChangePassword: ({ currentPassword, newPassword }) => authStore.changePassword(currentPassword, newPassword)
    });

    this.main = createElement('main', {
      className: 'app-main',
      id: 'main-content'
    });

    this.shell = createElement('div', { className: 'app-shell' },
      this.navbar.element,
      this.main,
      Footer()
    );
  }

  mountShell() {
    this.ensureShell();

    if (this.appContainer.firstElementChild !== this.shell) {
      this.appContainer.innerHTML = '';
      this.appContainer.appendChild(this.shell);
    }

    this.shell.classList.remove('hidden');
    this.updateShellState();
  }

  unmountShell() {
    if (this.shell) {
      this.shell.classList.add('hidden');
    }
  }

  updateShellState(hash = window.location.hash || '#/home', user = authStore.getState().user) {
    if (!this.navbar) return;

    this.navbar.update({
      currentHash: hash,
      user,
      scrolled: window.scrollY > 16
    });
  }

  findRoute(hash) {
    const routeHash = hash.split('?')[0];

    for (const route of this.routes) {
      const regexPath = '^' + route.path.replace(/:([^/]+)/g, '([^/]+)') + '$';
      const match = routeHash.match(new RegExp(regexPath));

      if (!match) continue;

      const params = {};
      const paramNames = (route.path.match(/:([^/]+)/g) || []).map(param => param.slice(1));
      paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]);
      });

      return { route, params };
    }

    return null;
  }

  async renderPage(pageElement, useShell) {
    if (!useShell) {
      this.unmountShell();
      this.appContainer.innerHTML = '';
      if (pageElement) this.appContainer.appendChild(pageElement);
      return;
    }

    this.mountShell();

    const previous = this.main.firstElementChild;
    if (previous) {
      previous.classList.remove('route-view-enter', 'route-view-enter-active');
      previous.classList.add('route-view-exit');
      await waitForRouteExit();
    }

    this.main.innerHTML = '';

    if (pageElement) {
      pageElement.classList.add('route-view-enter');
      this.main.appendChild(pageElement);

      requestAnimationFrame(() => {
        pageElement.classList.add('route-view-enter-active');
      });
    }
  }

  async handleRoute() {
    let hash = window.location.hash || '#/home';

    if (!hash.startsWith('#/')) {
      hash = '#/home';
    }

    const match = this.findRoute(hash);
    if (!match) {
      window.location.hash = '#/home';
      return;
    }

    const { route, params } = match;

    const authState = authStore.getState();
    let isAuthenticated = authState.isAuthenticated;
    let user = authState.user;

    if (!user) {
      const check = await authStore.checkAuth();
      isAuthenticated = check;
      user = authStore.getState().user;
    }

    if (route.requiresAuth && !isAuthenticated) {
      window.location.hash = '#/login';
      return;
    }

    if (route.guestOnly && isAuthenticated) {
      window.location.hash = '#/home';
      return;
    }

    const pageUsesShell = isAuthenticated && !hash.startsWith('#/login') && !hash.startsWith('#/player');

    try {
      const pageParams = { ...route.defaultParams, ...params };
      const pageComponentModule = await route.pageLoader();
      const pageElement = pageComponentModule.default(pageParams);

      this.updateShellState(hash, user);
      await this.renderPage(pageElement, pageUsesShell);
      window.scrollTo(0, 0);
      this.updateShellState(hash, user);
    } catch (error) {
      console.error('[Router Navigation Error]', error);
    }
  }
}

function waitForRouteExit() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    window.setTimeout(resolve, 160);
  });
}

export const router = new Router();
