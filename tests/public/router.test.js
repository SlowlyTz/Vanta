import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/public/js/store/auth.store.js', () => ({
  authStore: {
    getState: () => ({ isAuthenticated: true, user: { id: 1, name: 'Test', isAdmin: false } }),
    subscribe: () => () => {},
    checkAuth: async () => true
  }
}));

vi.mock('../../src/public/js/components/navbar/Navbar.js', () => ({
  Navbar: () => ({ element: document.createElement('nav'), update: vi.fn(), setScrolled: vi.fn() })
}));

vi.mock('../../src/public/js/components/footer.js', () => ({
  Footer: () => document.createElement('footer')
}));

const { Router, focusAutofocusTarget } = await import('../../src/public/js/router.js');

function page(html) {
  const element = document.createElement('div');
  element.innerHTML = html;
  return element;
}

describe('focusAutofocusTarget', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fokussiert das erste [data-autofocus]-Element', () => {
    const element = page('<input id="a"><input id="b" data-autofocus><input id="c" data-autofocus>');
    document.body.appendChild(element);

    const focused = focusAutofocusTarget(element);

    expect(focused.id).toBe('b');
    expect(document.activeElement).toBe(focused);
  });

  it('überspringt Elemente in einem .hidden-Container', () => {
    const element = page(
      '<div class="hidden"><input id="versteckt" data-autofocus></div>' +
      '<div><input id="sichtbar" data-autofocus></div>'
    );
    document.body.appendChild(element);

    expect(focusAutofocusTarget(element).id).toBe('sichtbar');
  });

  it('überspringt Elemente in einem [hidden]-Container und selbst versteckte Elemente', () => {
    const element = page(
      '<div hidden><input id="a" data-autofocus></div>' +
      '<input id="b" data-autofocus hidden>' +
      '<input id="c" data-autofocus>'
    );
    document.body.appendChild(element);

    expect(focusAutofocusTarget(element).id).toBe('c');
  });

  it('gibt null zurück, wenn es kein Ziel gibt', () => {
    const element = page('<input>');
    document.body.appendChild(element);

    expect(focusAutofocusTarget(element)).toBeNull();
    expect(focusAutofocusTarget(null)).toBeNull();
  });

  it('fokussiert ohne zu scrollen', () => {
    const element = page('<input data-autofocus>');
    document.body.appendChild(element);
    const input = element.querySelector('input');
    const focus = vi.spyOn(input, 'focus');

    focusAutofocusTarget(element);

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('schluckt Fehler aus focus() und bricht die Navigation nicht ab', () => {
    const element = page('<input data-autofocus>');
    document.body.appendChild(element);
    vi.spyOn(element.querySelector('input'), 'focus').mockImplementation(() => {
      throw new Error('nope');
    });

    expect(() => focusAutofocusTarget(element)).not.toThrow();
  });
});

describe('Router.renderPage', () => {
  let router;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    router = new Router();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('fokussiert das Ziel, nachdem die Seite ohne Shell eingehängt wurde', async () => {
    const element = page('<input data-autofocus>');

    await router.renderPage(element, false);

    expect(document.activeElement).toBe(element.querySelector('input'));
  });

  it('fokussiert das Ziel, nachdem die Seite in die Shell eingehängt wurde', async () => {
    const element = page('<input data-autofocus>');

    await router.renderPage(element, true);

    expect(element.isConnected).toBe(true);
    expect(document.activeElement).toBe(element.querySelector('input'));
  });
});

describe('Router · hash changes a page handles itself', () => {
  let router;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    router = new Router();
    router.handleRoute = vi.fn();
    router.init();
    router.handleRoute.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    window.history.replaceState(null, '', '#/home');
  });

  it('leaves the page standing when it takes the new hash', async () => {
    const element = page('');
    element.handleHashChange = vi.fn(hash => hash.startsWith('#/admin'));
    router.currentPage = element;
    await router.renderPage(element, true);

    window.history.replaceState(null, '', '#/admin/users');
    window.dispatchEvent(new Event('hashchange'));
    expect(element.handleHashChange).toHaveBeenCalledWith('#/admin/users');
    expect(router.handleRoute).not.toHaveBeenCalled();

    window.history.replaceState(null, '', '#/home');
    window.dispatchEvent(new Event('hashchange'));
    expect(router.handleRoute).toHaveBeenCalledTimes(1);
  });
});

describe('Router · page scopes', () => {
  let router;

  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    router = new Router();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    window.history.replaceState(null, '', '#/home');
    vi.restoreAllMocks();
  });

  it('hands each page a scope and ends it when the next page replaces it', async () => {
    const scopes = [];
    const factory = (params, scope) => { scopes.push(scope); return page(''); };
    router.add('#/home', async () => ({ default: factory }));
    router.add('#/search', async () => ({ default: factory }));

    window.history.replaceState(null, '', '#/home');
    await router.handleRoute();
    expect(scopes).toHaveLength(1);
    const left = vi.fn();
    scopes[0].onLeave(left);

    window.history.replaceState(null, '', '#/search');
    await router.handleRoute();
    expect(left).toHaveBeenCalledTimes(1);
    expect(scopes[0].signal.aborted).toBe(true);
    expect(scopes[1].isLeft).toBe(false);
  });

  it('lets a newer navigation win over an older one that resumes later', async () => {
    let releaseSlow;
    const slowLoaded = new Promise(resolve => { releaseSlow = resolve; });
    const built = [];
    router.add('#/slow', () => slowLoaded.then(() => ({ default: () => { built.push('slow'); return page('slow'); } })));
    router.add('#/fast', async () => ({ default: () => { built.push('fast'); return page('fast'); } }));

    window.history.replaceState(null, '', '#/slow');
    const slow = router.handleRoute();
    window.history.replaceState(null, '', '#/fast');
    await router.handleRoute();
    releaseSlow();
    await slow;

    expect(built).toEqual(['fast']);
  });
});

describe('Router · scrolling', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('only flips the navbar look, once per frame, instead of rebuilding it', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const frames = [];
    vi.stubGlobal('requestAnimationFrame', (fn) => { frames.push(fn); return frames.length; });
    const router = new Router();
    router.handleRoute = vi.fn();
    router.init();
    router.ensureShell();
    router.navbar.update.mockClear();

    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });
    // Other routers from earlier tests listen too; each asks for one frame.
    window.dispatchEvent(new Event('scroll'));
    const perEvent = frames.length;
    for (let i = 0; i < 4; i++) window.dispatchEvent(new Event('scroll'));
    expect(frames).toHaveLength(perEvent);
    frames.forEach(frame => frame());

    expect(router.navbar.setScrolled).toHaveBeenCalledWith(true);
    expect(router.navbar.update).not.toHaveBeenCalled();
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });
});
