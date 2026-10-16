// The lifetime of one routed page. The router creates a scope per page,
// hands it to the page factory and calls leave() when the page is replaced,
// before its DOM is dropped. Anything a page or its components start that
// would outlive the DOM (listeners on window, observers, timers, store
// subscriptions, requests) registers its cleanup with onLeave() or passes
// `signal` to the request; then nothing keeps running after navigation.

// The abort reason of a page that was left: requests aborted for it never
// settle (see api/client.js), so the gone page neither renders nor shows an
// error for them.
export const PAGE_LEFT = Object.freeze({ name: 'PageLeft', message: 'The page was left' });

export function createPageScope() {
  const controller = new AbortController();
  const cleanups = [];
  let left = false;

  return {
    signal: controller.signal,

    get isLeft() {
      return left;
    },

    // Runs `cleanup` when the page is left; at once if it already was.
    onLeave(cleanup) {
      if (typeof cleanup !== 'function') return () => {};
      if (left) {
        cleanup();
        return () => {};
      }
      cleanups.push(cleanup);
      return () => {
        const index = cleanups.indexOf(cleanup);
        if (index >= 0) cleanups.splice(index, 1);
      };
    },

    // addEventListener that is removed again when the page is left.
    listen(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      return this.onLeave(() => target.removeEventListener(type, handler, options));
    },

    leave() {
      if (left) return;
      left = true;
      // Chromium before 98 (TVs) drops the abort reason: the signal carries
      // its own mark, which api/client.js checks as well.
      controller.signal.vantaPageLeft = true;
      controller.abort(PAGE_LEFT);
      for (const cleanup of cleanups.splice(0).reverse()) {
        try {
          cleanup();
        } catch (error) {
          console.error('[Page cleanup]', error);
        }
      }
    }
  };
}

// The scope of the page being built right now (page factories run
// synchronously), else the page on screen. Components find their page here
// without every caller passing it along, also when they are built after a
// request: requests of a left page never settle, so that code does not run
// for a page that is gone.
let currentScope = null;
let activeScope = null;

export const getCurrentPageScope = () => currentScope || (activeScope && !activeScope.isLeft ? activeScope : null);

// The router names the page on screen.
export const setActivePageScope = (scope) => { activeScope = scope; };

export function runInPageScope(scope, build) {
  const previous = currentScope;
  currentScope = scope;
  try {
    return build();
  } finally {
    currentScope = previous;
  }
}

// The scope a page or component works with: the one it was given, the page
// being built, or (outside any page: the navbar, tests) one that is never
// left, so callers can use onLeave() unconditionally.
export const resolvePageScope = (scope) => scope || getCurrentPageScope() || createPageScope();
