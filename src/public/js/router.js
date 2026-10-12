import { authStore } from './store/auth.store.js';
import { createElement } from './utils/dom.js';
import { REDIRECT_AFTER_LOGIN_KEY } from './utils/auth-redirect.js';
import { checkServerBuild } from './utils/appVersion.js';
import { Navbar, startScreensaverNow } from './components/navbar/Navbar.js';
import { Footer } from './components/footer.js';
import { TvSidebar } from './components/tv/TvSidebar.js';
import { createPageScope, runInPageScope, setActivePageScope } from './utils/pageScope.js';
import { ensurePageStyles } from './utils/pageStyles.js';
import { prefersReducedMotion } from './utils/motion.js';

// Focuses the page's [data-autofocus] element once it is attached to the document.
// Pages cannot do this themselves: their factory runs while the element is still
// detached, so a focus() call there is a silent no-op.
export function focusAutofocusTarget(pageElement) {
  if (!pageElement) return null;

  // On a TV a focused text field opens the system keyboard; the focus engine
  // starts there instead.
  const tv = document.documentElement.classList.contains('tv-mode');
  for (const target of pageElement.querySelectorAll('[data-autofocus]')) {
    if (target.hidden || target.closest('[hidden], .hidden')) continue;
    if (tv && target.matches('input, textarea')) return null;
    try {
      target.focus({ preventScroll: true });
    } catch {
      // ignore
    }
    return target;
  }

  return null;
}

// From this far down the navbar takes its scrolled look.
const SCROLLED_OFFSET = 16;

export class Router {
  constructor() {
    this.routes = [];
    this.appContainer = document.getElementById('app');
    this.shell = null;
    this.navbar = null;
    this.main = null;
    this.unsubscribeAuth = null;
    this.currentScope = null;
    this.currentHash = null;
    this.previousHash = null;
  }

  // Ends the shown page's scope: its listeners, timers, observers and
  // requests stop before its DOM goes.
  leaveCurrentPage() {
    const scope = this.currentScope;
    this.currentScope = null;
    scope?.leave();
  }

  add(path, pageLoader, options = {}) {
    this.routes.push({ path, pageLoader, ...options });
  }

  init() {
    window.addEventListener('hashchange', () => {
      // A page can take a hash change within itself (the admin area slides its
      // sections in and out); the router then leaves the page standing.
      const hash = window.location.hash || '#/home';
      const page = this.currentPage;
      if (page?.isConnected && page.handleHashChange?.(hash)) {
        this.updateShellState(hash);
        return;
      }
      this.handleRoute();
    });
    // Scrolling only moves the navbar between its two looks: one check per
    // frame, and only a change touches the DOM.
    let scrollFrame = null;
    window.addEventListener('scroll', () => {
      if (scrollFrame !== null) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        this.navbar?.setScrolled(window.scrollY > SCROLLED_OFFSET);
      });
    }, { passive: true });

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
      id: 'main-content',
      tabindex: '-1'
    });

    // TV mode: a sidebar instead of the navbar and footer. The navbar is
    // still made, for the dialogs it owns (settings, watch party).
    if (document.documentElement.classList.contains('tv-mode')) {
      this.tvSidebar = TvSidebar({
        onOpenSettings: () => this.navbar.openSettings(),
        onOpenWatchParty: () => this.navbar.openWatchParty(),
        onOpenScreensaver: () => startScreensaverNow()
      });
      this.main.dataset.tvGroup = 'content';
      this.shell = createElement('div', { className: 'app-shell tv-shell' }, this.tvSidebar.element, this.main);
      return;
    }

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
    this.tvSidebar?.update({ currentHash: hash, user });

    this.navbar.update({
      currentHash: hash,
      user,
      scrolled: window.scrollY > SCROLLED_OFFSET
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
      if (pageElement) {
        this.appContainer.appendChild(pageElement);
        focusAutofocusTarget(pageElement);
      }
      return;
    }

    this.mountShell();
    this.main.classList.toggle(
      'app-main--edge-top',
      pageElement?.dataset?.edgeTop === 'true'
    );

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
      focusAutofocusTarget(pageElement);

      requestAnimationFrame(() => {
        pageElement.classList.add('route-view-enter-active');
      });
    }
  }

  async handleRoute() {
    // A newer navigation that finishes its awaits first wins; an older one
    // that resumes afterwards must not put its page over it.
    const navigation = (this.navigationId = (this.navigationId || 0) + 1);
    const superseded = () => navigation !== this.navigationId;

    let hash = window.location.hash || '#/home';

    if (!hash.startsWith('#/')) {
      hash = '#/home';
    }

    // The admin area is not part of the TV interface.
    if (hash.startsWith('#/admin') && document.documentElement.classList.contains('tv-mode')) {
      window.location.hash = '#/home';
      return;
    }

    const match = this.findRoute(hash);
    if (!match) {
      window.location.hash = '#/home';
      return;
    }

    // Where the user came from (the player returns there after its sleep timer).
    if (hash !== this.currentHash) {
      this.previousHash = this.currentHash || null;
      this.currentHash = hash;
    }

    const { route, params } = match;

    const authState = authStore.getState();
    let isAuthenticated = authState.isAuthenticated;
    let user = authState.user;

    if (!user) {
      const check = await authStore.checkAuth();
      isAuthenticated = check;
      user = authStore.getState().user;
      if (superseded()) return;
    }

    if (route.requiresAuth && !isAuthenticated) {
      try {
        sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, hash);
      } catch {
        // ignore
      }
      window.location.hash = '#/login';
      return;
    }

    if (route.guestOnly && isAuthenticated) {
      window.location.hash = '#/home';
      return;
    }

    const pageUsesShell = isAuthenticated
      && !hash.startsWith('#/login')
      && !hash.startsWith('#/player')
      && !hash.startsWith('#/watch-party');

    try {
      const pageParams = { ...route.defaultParams, ...params };
      // The page's own stylesheets load alongside its code, so it never shows
      // unstyled.
      const [pageComponentModule] = await Promise.all([route.pageLoader(), ensurePageStyles(route.styles)]);
      if (superseded()) return;
      const scope = createPageScope();
      let pageElement;
      try {
        pageElement = runInPageScope(scope, () => pageComponentModule.default(pageParams, scope));
      } catch (error) {
        scope.leave();
        throw error;
      }

      this.leaveCurrentPage();
      this.currentScope = scope;
      setActivePageScope(scope);
      this.updateShellState(hash, user);
      this.currentPage = pageElement;
      await this.renderPage(pageElement, pageUsesShell);
      if (pageElement?.dataset?.restoreScroll !== 'true') {
        window.scrollTo(0, 0);
      }
      this.updateShellState(hash, user);
      // The TV focus engine puts the focus on the new page.
      window.dispatchEvent(new CustomEvent('vanta:page-shown', { detail: { hash, page: pageElement, scope } }));
    } catch (error) {
      console.error('[Router Navigation Error]', error);
      // A page chunk a newer deploy has replaced fails to load; if that is
      // the cause, the update overlay takes over.
      checkServerBuild();
    }
  }
}

function waitForRouteExit() {
  if (prefersReducedMotion()) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    window.setTimeout(resolve, 160);
  });
}

export const router = new Router();
