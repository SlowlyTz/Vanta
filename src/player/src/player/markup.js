import { escapeHtml } from '../html.js';

export const HLS_FRAGMENT_TIMEOUT_MS = 90_000;
// Emitted by src/player/vite.config.js next to vanta-player.js.
export const HLS_WORKER_PATH = '/vendor/player/hls.worker.js';
export const NEXT_EPISODE_VIEWER_MESSAGE = 'Startet automatisch. Abbrechen oder sofort starten können nur Admins.';

const POSTER_FALLBACK_GRADIENT = 'radial-gradient(circle at 50% 50%, #1a1a20 0%, #050505 100%)';

const ICONS = {
  arrowBack: '<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>',
  play: '<path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.6-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14z"/>',
  pause: '<path d="M7 5h3.2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm6.8 0H17a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3.2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  replay: '<path d="M12 5V2L7.5 6.5 12 11V7.2a5.8 5.8 0 1 1-5.8 5.8H4a8 8 0 1 0 8-8z"/>',
  forward: '<path d="M12 5V2l4.5 4.5L12 11V7.2a5.8 5.8 0 1 0 5.8 5.8H20a8 8 0 1 1-8-8z"/>',
  skipNext: '<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>',
  settings: '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84a.484.484 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.27.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6z"/>',
  lock: '<path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V7z"/>',
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

// A seek button: the circular arrow with the step written underneath, so it
// reads as "10 seconds back/forward" at a glance.
function seekButton(direction, size) {
  const back = direction < 0;
  const label = back ? '10 Sekunden zurück' : '10 Sekunden vor';
  return `
    <button class="vanta-player-seek vanta-player-seek-${back ? 'back' : 'forward'} is-${size}" type="button"
      data-seek="${back ? -10 : 10}" aria-label="${label}" title="${label}">
      <span class="vanta-player-seek-icon">${svgIcon(back ? 'replay' : 'forward')}</span>
      <span class="vanta-player-seek-label" aria-hidden="true">10s</span>
    </button>`;
}

function playButton(size) {
  return `
    <button class="vanta-player-play is-${size}" type="button" aria-label="Wiedergabe" data-state="paused">
      <span class="vanta-player-play-icon is-play">${svgIcon('play')}</span>
      <span class="vanta-player-play-icon is-pause">${svgIcon('pause')}</span>
    </button>`;
}

export function createPlayerMarkup(root, { title, subtitle, poster }) {
  const escapedTitle = title ? escapeHtml(title) : '';
  const escapedSubtitle = subtitle ? escapeHtml(subtitle) : '';

  root.innerHTML = `
    <div class="vanta-player-shell">
      <media-player class="vanta-media-player" aria-label="Videoplayer">
        <media-outlet></media-outlet>
        <media-captions class="vanta-player-captions"></media-captions>

        <div class="vanta-player-tap-layer" aria-hidden="true"></div>

        <div class="vanta-player-volume-bubble" aria-hidden="true">
          <span class="vanta-player-volume-bubble-icon">
            ${svgIcon('volumeMute')}${svgIcon('volumeLow')}${svgIcon('volumeHigh')}
          </span>
          <span class="vanta-player-volume-bubble-bar"><i></i></span>
          <span class="vanta-player-volume-bubble-value"></span>
        </div>
        <button class="vanta-player-skip-segment" type="button" hidden>
          <span class="vanta-player-skip-segment-label">Intro überspringen</span>
          ${svgIcon('skipNext')}
        </button>
        <div class="vanta-player-seek-bubble is-back" aria-hidden="true"></div>
        <div class="vanta-player-seek-bubble is-forward" aria-hidden="true"></div>

        <div class="vanta-player-controls-layer">
          <div class="vanta-player-topbar">
            <button class="vanta-player-back" type="button" aria-label="Zurück">
              ${svgIcon('arrowBack')}
              <span>Zurück</span>
            </button>
            <div class="vanta-player-heading">
              <div class="vanta-player-title">${escapedTitle}</div>
              <div class="vanta-player-subtitle"${escapedSubtitle ? '' : ' hidden'}>${escapedSubtitle}</div>
            </div>
            <div class="vanta-player-topbar-end">
              <div class="vanta-player-party-pill" hidden>
                ${svgIcon('lock')}
                <span>Admin steuert</span>
              </div>
            </div>
          </div>

          <div class="vanta-player-center-controls vanta-player-transport">
            ${seekButton(-1, 'large')}
            ${playButton('large')}
            ${seekButton(1, 'large')}
          </div>

          <div class="vanta-player-bottom-controls">
            <div class="vanta-player-timeline-row">
              <media-time-slider class="vanta-player-time-slider" aria-label="Zeitleiste">
                <div slot="preview" class="vanta-player-time-preview">
                  <media-slider-value type="pointer" format="time"></media-slider-value>
                </div>
              </media-time-slider>
            </div>
            <div class="vanta-player-controls-row">
              <div class="vanta-player-controls-left">
                <div class="vanta-player-transport vanta-player-transport-bar">
                  ${seekButton(-1, 'small')}
                  ${playButton('small')}
                  ${seekButton(1, 'small')}
                </div>
                <div class="vanta-player-time">
                  <media-time type="current"></media-time>
                  <span class="vanta-player-time-separator">/</span>
                  <media-time type="duration"></media-time>
                </div>
              </div>
              <div class="vanta-player-controls-right">
                <div class="vanta-player-volume">
                  <media-mute-button class="vanta-player-mute-button" aria-label="Stummschalten">
                    ${svgIcon('volumeMute', 'volume-muted')}
                    ${svgIcon('volumeLow', 'volume-low')}
                    ${svgIcon('volumeHigh', 'volume-high')}
                  </media-mute-button>
                  <div class="vanta-player-volume-reveal">
                    <media-volume-slider class="vanta-player-volume-slider" aria-label="Lautstärke"></media-volume-slider>
                  </div>
                </div>
                <button class="vanta-player-settings-button" type="button" aria-label="Einstellungen" aria-haspopup="dialog" aria-expanded="false" hidden>
                  ${svgIcon('settings')}
                </button>
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
          <span class="vanta-player-loading-progress" hidden>
            <span class="vanta-player-loading-track" aria-hidden="true"><span class="vanta-player-loading-bar"></span></span>
            <span class="vanta-player-loading-progress-text"></span>
          </span>
          <span class="vanta-player-loading-log">
            <span aria-hidden="true">›</span>
            <span class="vanta-player-loading-status">Wiedergabequelle wird angefragt …</span>
          </span>
        </div>
      </div>

      <div class="vanta-player-inline-loading" role="status" aria-live="polite" hidden>
        <div class="vanta-player-inline-spinner" aria-hidden="true"></div>
        <span class="vanta-player-inline-label" hidden></span>
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
  // Keyboard control lives in shortcuts.js; vidstack's own is switched off.
  player.keyShortcuts = {};

  const backdrop = root.querySelector('.vanta-player-loading-backdrop');
  if (poster) {
    backdrop.style.backgroundImage = `url("${poster.replaceAll('"', '%22')}")`;
  } else {
    backdrop.style.backgroundImage = POSTER_FALLBACK_GRADIENT;
  }

  return {
    player,
    playButtons: [...root.querySelectorAll('.vanta-player-play')],
    seekButtons: [...root.querySelectorAll('.vanta-player-seek')],
    seekBubbles: {
      back: root.querySelector('.vanta-player-seek-bubble.is-back'),
      forward: root.querySelector('.vanta-player-seek-bubble.is-forward')
    },
    settingsButton: root.querySelector('.vanta-player-settings-button'),
    volumeBubble: root.querySelector('.vanta-player-volume-bubble'),
    backButton: root.querySelector('.vanta-player-back'),
    loading: root.querySelector('.vanta-player-loading'),
    loadingStatus: root.querySelector('.vanta-player-loading-status'),
    inlineLoading: root.querySelector('.vanta-player-inline-loading'),
    inlineLabel: root.querySelector('.vanta-player-inline-label'),
    loadingProgress: root.querySelector('.vanta-player-loading-progress'),
    loadingProgressBar: root.querySelector('.vanta-player-loading-bar'),
    loadingProgressText: root.querySelector('.vanta-player-loading-progress-text')
  };
}
