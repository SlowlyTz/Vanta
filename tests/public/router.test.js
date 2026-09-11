import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/public/js/store/auth.store.js', () => ({
  authStore: {
    getState: () => ({ isAuthenticated: true, user: { id: 1, name: 'Test', isAdmin: false } }),
    subscribe: () => () => {},
    checkAuth: async () => true
  }
}));

vi.mock('../../src/public/js/components/navbar/Navbar.js', () => ({
  Navbar: () => ({ element: document.createElement('nav'), update: () => {} })
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
