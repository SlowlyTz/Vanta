// Stylesheets of single areas (admin, requests, player, watch party …) load
// with their page instead of with the app shell. A route names its bundles
// (css/bundles/<name>.css); the router waits for them before it shows the
// page, so nothing appears unstyled. Each bundle is linked once and stays.
//
// In production the server writes the hashed file of every bundle into
// index.html (#vanta-page-styles, from the Vite manifest); in development the
// bundles are served as they are and resolve their @imports themselves.

// Files a bundle needs besides its own, in this order after it. The player's
// stylesheet has a fixed URL because its build is separate from the app's.
const EXTRA_FILES = {
  player: ['/vendor/player/vanta-player.css']
};

// The order index.html used to link these files in. Whatever is loaded
// first, the links always stand in this order, so the cascade is the same as
// when they were all linked up front.
const BUNDLE_ORDER = ['login', 'publishers', 'profile', 'requests', 'admin', 'trailer-scroller', 'watch-party', 'player'];

// A stylesheet that cannot load must not hold the page back forever.
const LOAD_TIMEOUT_MS = 8000;

const loaded = new Map(); // href -> Promise

let manifest;
function bundleHref(name) {
  if (manifest === undefined) {
    try {
      manifest = JSON.parse(document.getElementById('vanta-page-styles')?.textContent || 'null');
    } catch {
      manifest = null;
    }
  }
  return manifest?.[name] || `/css/bundles/${name}.css`;
}

// Places a page link before the first one that comes later in BUNDLE_ORDER.
function insertInOrder(link) {
  const rank = Number(link.dataset.pageStyles);
  const later = [...document.head.querySelectorAll('link[data-page-styles]')]
    .find(other => Number(other.dataset.pageStyles) > rank);
  document.head.insertBefore(link, later || null);
}

function linkStylesheet(href, rank) {
  if (loaded.has(href)) return loaded.get(href);

  const existing = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .find(link => link.getAttribute('href') === href);
  if (existing) {
    loaded.set(href, Promise.resolve());
    return loaded.get(href);
  }

  const promise = new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.pageStyles = String(rank);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, LOAD_TIMEOUT_MS);
    link.addEventListener('load', done, { once: true });
    link.addEventListener('error', () => {
      // A later visit may try again (a deploy, a flaky network).
      loaded.delete(href);
      done();
    }, { once: true });
    insertInOrder(link);
  });

  loaded.set(href, promise);
  return promise;
}

// Every file of the given bundles with its place in the overall order.
function pageStyleFiles(names = []) {
  return names.flatMap(name => {
    const position = BUNDLE_ORDER.indexOf(name);
    const base = (position < 0 ? BUNDLE_ORDER.length : position) * 10;
    return [bundleHref(name), ...(EXTRA_FILES[name] || [])].map((href, index) => ({ href, rank: base + index }));
  });
}

export const pageStyleHrefs = (names = []) => pageStyleFiles(names).map(file => file.href);

// Resolves once every stylesheet of the given bundles has loaded (or failed).
export function ensurePageStyles(names = []) {
  if (!names || names.length === 0) return Promise.resolve();
  return Promise.all(pageStyleFiles(names).map(({ href, rank }) => linkStylesheet(href, rank))).then(() => undefined);
}

// Test helper.
export function resetPageStyles() {
  loaded.clear();
  manifest = undefined;
}
