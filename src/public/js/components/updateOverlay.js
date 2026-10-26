// Full-screen, not dismissable notice that this page runs an older build than the
// server. It blocks everything, a running stream included: old code against a new
// server is where the bugs come from. "Update" reloads past every cache.
import { createElement } from '../utils/dom.js';
import { SERVER_BUILD_EVENT, checkServerBuild, getClientBuild } from '../utils/appVersion.js';
import { APP_VERSION } from '../shared/version.js';

const REFRESH_ICON = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"></path><path d="M21 3v6h-6"></path></svg>`;

// Names the step as "1.01 → 1.02": this tab's release against the server's.
export function mountUpdateOverlay({
  clientBuild = getClientBuild(),
  clientVersion = APP_VERSION,
  fetchImpl = (...args) => window.fetch(...args),
  reload = () => window.location.reload()
} = {}) {
  // Without a build id (development) there is nothing to compare.
  if (!clientBuild) return () => {};

  let updating = false;

  const status = createElement('p', { className: 'offline-status', 'aria-live': 'polite' });
  const currentVersion = createElement('span', { className: 'update-version update-version--current' }, clientVersion);
  const nextVersion = createElement('span', { className: 'update-version update-version--next' });
  const versions = createElement('p', { className: 'update-versions', hidden: true },
    currentVersion,
    createElement('span', { className: 'update-version-arrow', 'aria-label': 'auf' }, '→'),
    nextVersion
  );
  const updateButton = createElement('button', {
    type: 'button',
    className: 'btn-primary offline-retry',
    onClick: () => { forceUpdate(); }
  }, 'Update');

  const icon = createElement('span', { className: 'offline-icon update-icon' });
  icon.innerHTML = REFRESH_ICON;

  const overlay = createElement('div', {
    className: 'offline-overlay update-overlay',
    role: 'alertdialog',
    'aria-modal': 'true',
    'aria-labelledby': 'update-title',
    'aria-describedby': 'update-text',
    hidden: true
  },
    createElement('div', { className: 'offline-card' },
      createElement('img', { className: 'offline-logo', src: '/assets/logo-vanta.png', alt: 'VANTA' }),
      icon,
      createElement('h2', { className: 'offline-title', id: 'update-title' }, 'Neue Version verfügbar'),
      versions,
      createElement('p', { className: 'offline-text', id: 'update-text' },
        'Du benutzt nicht die aktuellste Version von VANTA. Aktualisiere jetzt, damit alles fehlerfrei läuft.'),
      updateButton,
      status
    )
  );

  const stopMedia = () => {
    document.querySelectorAll('video, audio').forEach(media => {
      try { media.pause(); } catch { /* already gone */ }
    });
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  // The same release with a new build (a rebuild without a bump) shows no
  // arrow; an unknown version is asked from the server once.
  const setServerVersion = (version) => {
    if (!version || !clientVersion) return;
    nextVersion.textContent = version;
    versions.hidden = version === clientVersion;
  };

  const loadServerVersion = async () => {
    try {
      const response = await fetchImpl('/api/version', { cache: 'no-store' });
      if (!response?.ok) return;
      const { version } = await response.json();
      setServerVersion(version);
    } catch { /* the overlay still works without the version line */ }
  };

  const show = (version) => {
    if (version) setServerVersion(version);
    else if (nextVersion.textContent === '') loadServerVersion();
    if (!overlay.hidden) return;
    stopMedia();
    overlay.hidden = false;
    updateButton.focus?.();
  };

  async function forceUpdate() {
    if (updating) return;
    updating = true;
    updateButton.disabled = true;
    status.textContent = 'VANTA wird aktualisiert…';
    try {
      const registration = await navigator.serviceWorker?.getRegistration?.();
      await registration?.update();
    } catch { /* no service worker: nothing to refresh */ }
    try {
      // Replaces the cached shell so the reload cannot come back from cache.
      await fetchImpl(window.location.pathname || '/', { cache: 'reload' });
    } catch { /* the reload below still revalidates */ }
    reload();
  }

  const onServerBuild = event => {
    const build = event.detail?.build;
    if (build && build !== clientBuild) show(event.detail?.version);
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') checkServerBuild({ fetchImpl });
  };

  window.addEventListener(SERVER_BUILD_EVENT, onServerBuild);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.body.appendChild(overlay);
  checkServerBuild({ fetchImpl });

  return () => {
    window.removeEventListener(SERVER_BUILD_EVENT, onServerBuild);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    overlay.remove();
  };
}
