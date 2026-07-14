export const HLS_FRAGMENT_TIMEOUT_MS = 90_000;
export const WHEEL_SEEK_DEBOUNCE_MS = 320;
export const NEXT_EPISODE_THRESHOLD = 0.9;
export const NEXT_EPISODE_VIEWER_MESSAGE = 'Die nächste Folge kann von einem WatchTogether-Admin gestartet werden.';

const POSTER_FALLBACK_GRADIENT = 'radial-gradient(circle at 50% 50%, #1a1a20 0%, #050505 100%)';

const ICONS = {
  arrowBack: '<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>',
  skipBackward: '<path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>',
  skipForward: '<path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>',
  volumeMute: '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',
  volumeLow: '<path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>',
  volumeHigh: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>',
  fullscreenEnter: '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
  fullscreenExit: '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>',
  pipEnter: '<path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>',
  pipExit: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7.02-3H19V8h-1.98v6.18L11 8v6h.98l-2-2v2.82l2 2z"/>'
};

export function svgIcon(name, slot) {
  const path = ICONS[name];
  if (!path) return '';
  const slotAttr = slot ? ` slot="${slot}"` : '';
  return `<svg viewBox="0 0 24 24" aria-hidden="true"${slotAttr}>${path}</svg>`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createPlayerMarkup(root, { title, poster }) {
  const escapedTitle = title ? escapeHtml(title) : '';

  root.innerHTML = `
    <div class="vanta-player-shell">
      <media-player class="vanta-media-player" aria-label="Videoplayer">
        <media-outlet></media-outlet>
        <media-captions class="vanta-player-captions"></media-captions>

        <media-gesture class="vanta-player-gesture vanta-player-gesture-left" event="dblpointerup" action="seek:-10" aria-hidden="true"></media-gesture>
        <media-gesture class="vanta-player-gesture vanta-player-gesture-right" event="dblpointerup" action="seek:10" aria-hidden="true"></media-gesture>

        <div class="vanta-player-controls-layer">
          <div class="vanta-player-topbar">
            <button class="vanta-player-back" type="button" aria-label="Zurück">
              ${svgIcon('arrowBack')}
              <span>Zurück</span>
            </button>
            <div class="vanta-player-title">${escapedTitle}</div>
          </div>

          <div class="vanta-player-center-controls">
            <media-seek-button class="vanta-player-center-skip vanta-player-center-skip-left" seconds="-10" aria-label="10 Sekunden zurück">
              ${svgIcon('skipBackward', 'backward')}
            </media-seek-button>
            <media-play-button class="vanta-player-center-play" aria-label="Wiedergabe">
              ${svgIcon('play', 'play')}
              ${svgIcon('pause', 'pause')}
            </media-play-button>
            <media-seek-button class="vanta-player-center-skip vanta-player-center-skip-right" seconds="10" aria-label="10 Sekunden vorwärts">
              ${svgIcon('skipForward', 'forward')}
            </media-seek-button>
          </div>

          <div class="vanta-player-bottom-controls">
            <div class="vanta-player-timeline-row">
              <media-time-slider class="vanta-player-time-slider" aria-label="Zeitleiste"></media-time-slider>
              <div class="vanta-player-time">
                <media-time type="current"></media-time>
                <span class="vanta-player-time-separator">/</span>
                <media-time type="duration"></media-time>
              </div>
            </div>
            <div class="vanta-player-controls-row">
              <div class="vanta-player-controls-left">
                <media-play-button class="vanta-player-play-button" aria-label="Wiedergabe">
                  ${svgIcon('play', 'play')}
                  ${svgIcon('pause', 'pause')}
                </media-play-button>
                <media-seek-button class="vanta-player-skip-button" seconds="-10" aria-label="10 Sekunden zurück">
                  ${svgIcon('skipBackward', 'backward')}
                </media-seek-button>
                <media-seek-button class="vanta-player-skip-button" seconds="10" aria-label="10 Sekunden vorwärts">
                  ${svgIcon('skipForward', 'forward')}
                </media-seek-button>
              </div>
              <div class="vanta-player-controls-right">
                <media-mute-button class="vanta-player-mute-button" aria-label="Stummschalten">
                  ${svgIcon('volumeMute', 'volume-muted')}
                  ${svgIcon('volumeLow', 'volume-low')}
                  ${svgIcon('volumeHigh', 'volume-high')}
                </media-mute-button>
                <media-volume-slider class="vanta-player-volume-slider" aria-label="Lautstärke"></media-volume-slider>
                <media-pip-button class="vanta-player-pip-button" aria-label="Bild-in-Bild">
                  ${svgIcon('pipEnter', 'enter')}
                  ${svgIcon('pipExit', 'exit')}
                </media-pip-button>
                <button class="vanta-player-fullscreen-button" type="button" aria-label="Vollbild">
                  ${svgIcon('fullscreenEnter')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </media-player>

      <div class="vanta-player-loading" role="status" aria-live="polite">
        <div class="vanta-player-loading-backdrop"></div>
        <div class="vanta-player-loading-inner">
          <div class="vanta-player-spinner" aria-hidden="true"></div>
          <span class="vanta-player-loading-label">Video wird vorbereitet</span>
          <span class="vanta-player-loading-log">
            <span aria-hidden="true">›</span>
            <span class="vanta-player-loading-status">Wiedergabequelle wird angefragt …</span>
          </span>
        </div>
      </div>

      <div class="vanta-player-inline-loading" role="status" aria-live="polite" hidden>
        <div class="vanta-player-inline-spinner" aria-hidden="true"></div>
      </div>

      <div class="vanta-player-error" role="alert" hidden>
        <strong>Wiedergabefehler</strong>
        <p></p>
        <div>
          <button class="vanta-player-retry" type="button">Erneut versuchen</button>
          <button class="vanta-player-error-back" type="button">Zurück</button>
        </div>
      </div>
    </div>`;

  const player = root.querySelector('media-player');
  player.setAttribute('aria-label', title ? `Videoplayer: ${title}` : 'Videoplayer');
  player.title = title || '';
  player.poster = poster || '';
  player.autoplay = true;
  player.playsinline = true;
  player.load = 'eager';
  player.preload = 'auto';
  player.volume = 0.8;
  player.keyTarget = 'document';
  player.keyShortcuts = {
    togglePaused: 'k Space',
    toggleMuted: 'm',
    toggleFullscreen: 'f',
    seekBackward: 'ArrowLeft',
    seekForward: 'ArrowRight'
  };

  const backdrop = root.querySelector('.vanta-player-loading-backdrop');
  if (poster) {
    backdrop.style.backgroundImage = `url("${poster.replaceAll('"', '%22')}")`;
  } else {
    backdrop.style.backgroundImage = POSTER_FALLBACK_GRADIENT;
  }

  return {
    player,
    backButton: root.querySelector('.vanta-player-back'),
    loading: root.querySelector('.vanta-player-loading'),
    loadingStatus: root.querySelector('.vanta-player-loading-status'),
    inlineLoading: root.querySelector('.vanta-player-inline-loading'),
    error: root.querySelector('.vanta-player-error'),
    errorMessage: root.querySelector('.vanta-player-error p'),
    retryButton: root.querySelector('.vanta-player-retry'),
    errorBackButton: root.querySelector('.vanta-player-error-back')
  };
}
