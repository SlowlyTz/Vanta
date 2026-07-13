import Hls from 'hls.js';
import { isHLSProvider } from 'vidstack';
import 'vidstack/define/media-player.js';
import 'vidstack/define/media-outlet.js';
import 'vidstack/define/media-play-button.js';
import 'vidstack/define/media-seek-button.js';
import 'vidstack/define/media-time-slider.js';
import 'vidstack/define/media-time.js';
import 'vidstack/define/media-mute-button.js';
import 'vidstack/define/media-volume-slider.js';
import 'vidstack/define/media-fullscreen-button.js';
import 'vidstack/define/media-pip-button.js';
import 'vidstack/define/media-gesture.js';
import 'vidstack/define/media-captions.js';
import 'vidstack/styles/defaults.css';
import './player.css';

import { createJellyfinReporter } from './jellyfinReporter.js';
import {
  isIOSLike, supportsFinePointer, isPictureInPictureSupported,
  isFullscreen, enterFullscreen, exitFullscreen, exitPictureInPicture,
  enforceInlineVideoPlayback, enterInlineFullscreen, exitInlineFullscreen, isInlineFullscreen } from './platform.js';
import {
  isSmartphone,
  isLandscape,
  enterSmartphoneFullscreen,
  exitSmartphoneFullscreen,
  createOrientationGate
} from './orientation.js';
import { seekBy } from './seek.js';
import { createSourceSwitch } from './sourceSwitch.js';
import { createQualityMenu } from './quality.js';
import { createSubtitleMenu } from './subtitles.js';
import { createPlayerUi } from './ui/playerUi.js';
import { applyWatchPartyPermissions, computeRemoteControlTarget } from './watchParty.js';
import { createEpisodeBrowser } from './episodes.js';
import { createWatchPartyParticipantsMenu } from './watchPartyParticipants.js';
import { findNextEpisode, shouldShowNextEpisodePrompt, canStartNextEpisode, createNextEpisodeGate } from './nextEpisode.js';
import { createNextEpisodePrompt } from './nextEpisodePrompt.js';

const HLS_FRAGMENT_TIMEOUT_MS = 90_000;
const WHEEL_SEEK_DEBOUNCE_MS = 320;
const POSTER_FALLBACK_GRADIENT = 'radial-gradient(circle at 50% 50%, #1a1a20 0%, #050505 100%)';
const NEXT_EPISODE_THRESHOLD = 0.9;
const NEXT_EPISODE_VIEWER_MESSAGE = 'Die nächste Folge kann von einem WatchTogether-Admin gestartet werden.';

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

function svgIcon(name, slot) {
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

function createPlayerMarkup(root, { title, poster }) {
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

export async function mountVantaPlayer({
  root,
  itemId,
  title,
  poster,
  resumePosition = 0,
  resolvePlayback,
  reportPlayback,
  onBack,
  watchParty = null,
  episodeBrowser = null,
  deferInitialLoad = false
}) {
  await customElements.whenDefined('media-player');

  const iosLike = isIOSLike();
  const dom = createPlayerMarkup(root, { title, poster });
  const { player } = dom;
  if (iosLike) {
    const iosKeyShortcuts = { ...player.keyShortcuts };
    delete iosKeyShortcuts.toggleFullscreen;
    player.keyShortcuts = iosKeyShortcuts;
  }
  const disposers = [];
  const ui = createPlayerUi(root);

  let destroyed = false;
  let fallbackAttempted = false;
  let knownDuration = 0;
  let waitingTimer = null;
  let lastWheelSeekAt = 0;
  let ownerEchoSuppressionDepth = 0;
  const beginOwnerEchoSuppression = () => {
    ownerEchoSuppressionDepth += 1;
  };
  const endOwnerEchoSuppression = (delay = 250) => {
    window.setTimeout(() => {
      ownerEchoSuppressionDepth = Math.max(0, ownerEchoSuppressionDepth - 1);
    }, delay);
  };

  const watchPartyPhase = () => watchParty?.phase || watchParty?.mode || (watchParty?.enabled ? 'playback' : null);
  const isDeferredReadyRoom = () => watchPartyPhase() === 'ready-room';
  const canControlWatchParty = () => {
    if (!watchParty?.enabled) return true;
    return Boolean(watchParty.canControl ?? watchParty.isOwner);
  };
  const canEmitOwnerControl = () => (
    watchParty?.enabled && canControlWatchParty() && watchPartyPhase() === 'playback' && ownerEchoSuppressionDepth === 0
  );
  const fullKeyShortcuts = { ...player.keyShortcuts };
  const viewerKeyShortcuts = iosLike
    ? { toggleMuted: 'm' }
    : { toggleMuted: 'm', toggleFullscreen: 'f' };
  const refreshWatchPartyControlAccess = () => {
    if (!watchParty?.enabled) return;
    player.keyShortcuts = canControlWatchParty() ? fullKeyShortcuts : viewerKeyShortcuts;
    applyWatchPartyPermissions({ root, watchParty });
  };
  const forcePlaybackPhase = () => {
    if (!watchParty?.enabled) return;
    watchParty.phase = 'playback';
    watchParty.mode = 'playback';
  };

  if (watchParty?.enabled) {
    watchParty.onParticipantsChange = refreshWatchPartyControlAccess;
  }
  refreshWatchPartyControlAccess();

  const syncInlinePlayback = () => {
    if (!iosLike) return;
    enforceInlineVideoPlayback(root);
  };

  if (iosLike) {
    root.classList.add('is-ios', 'supports-ios-inline-fullscreen');
    syncInlinePlayback();
  }
  if (!isPictureInPictureSupported()) root.classList.add('no-pip');

  const shell = root.querySelector('.vanta-player-shell');
  const fullscreenButton = root.querySelector('.vanta-player-fullscreen-button');
  const updateFullscreenIcon = () => {
    if (!fullscreenButton) return;
    const inFullscreen = iosLike ? isInlineFullscreen(root) : isFullscreen();
    fullscreenButton.setAttribute('aria-label', inFullscreen ? 'Vollbild beenden' : 'Vollbild');
    fullscreenButton.innerHTML = svgIcon(inFullscreen ? 'fullscreenExit' : 'fullscreenEnter');
  };

  if (fullscreenButton) {
    const handleFullscreenClick = async () => {
      try {
        if (iosLike) {
          if (isInlineFullscreen(root)) exitInlineFullscreen(root);
          else enterInlineFullscreen(root);
          updateFullscreenIcon();
        } else if (isFullscreen()) {
          await exitFullscreen();
        } else {
          await enterFullscreen(shell);
        }
      } catch {
        // ignore fullscreen errors
      }
    };
    fullscreenButton.addEventListener('click', handleFullscreenClick);
    disposers.push(() => fullscreenButton.removeEventListener('click', handleFullscreenClick));
  }

  const fullscreenChangeEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
  fullscreenChangeEvents.forEach(event => {
    document.addEventListener(event, updateFullscreenIcon);
    disposers.push(() => document.removeEventListener(event, updateFullscreenIcon));
  });

  const reporter = createJellyfinReporter({
    player,
    itemId,
    report: reportPlayback
  });

  const isPhone = isSmartphone();
  let phoneOrientationActive = isPhone;
  let orientationLocked = false;
  let gateActive = false;
  const orientationGate = createOrientationGate({
    root,
    onEnter: async () => {
      try {
        if (iosLike) enterInlineFullscreen(root);
        await enterSmartphoneFullscreen({ root, onError: () => {} });
        orientationLocked = true;
        if (isLandscape()) {
          hideOrientationGate();
        }
      } catch {
        // remain in gate state
      }
    }
  });

  const showOrientationGate = () => {
    gateActive = true;
    orientationGate.show();
    player.paused = true;
    sourceSwitch.setIntendsToPlay(false);
  };

  const hideOrientationGate = () => {
    gateActive = false;
    orientationGate.hide();
    if (iosLike) {
      enterInlineFullscreen(root);
      updateFullscreenIcon();
    }
    sourceSwitch.setIntendsToPlay(true);
    player.play().catch(() => {});
  };

  const handleOrientationChange = () => {
    if (!phoneOrientationActive) return;
    if (isLandscape()) {
      hideOrientationGate();
    } else {
      showOrientationGate();
    }
  };

  const clearWaitingTimer = () => {
    if (!waitingTimer) return;
    window.clearTimeout(waitingTimer);
    waitingTimer = null;
  };

  const setLoading = (visible, status) => {
    if (status) dom.loadingStatus.textContent = status;
    dom.loading.classList.toggle('is-hidden', !visible);
  };

  const setLoadingStatus = status => {
    if (status) dom.loadingStatus.textContent = status;
  };

  const setInlineLoading = visible => {
    if (visible && !dom.loading.classList.contains('is-hidden')) return;
    dom.inlineLoading.hidden = !visible;
  };

  const hideError = () => {
    dom.error.hidden = true;
  };

  const showError = message => {
    clearWaitingTimer();
    sourceSwitch.clearSeekTimer();
    setLoading(false);
    setInlineLoading(false);
    ui.setState('error');
    dom.errorMessage.textContent = message || 'Der Medienstrom konnte nicht wiedergegeben werden.';
    dom.error.hidden = false;
  };

  const sourceSwitch = createSourceSwitch({
    player,
    reporter,
    ui,
    callbacks: {
      setLoading,
      setLoadingStatus,
      setInlineLoading,
      showError,
      hideError
    },
    onBeforeSourceChange: () => {
      exitPictureInPicture().catch(() => {});
    },
    shouldPreventPlayback: () => gateActive
  });

  if (isPhone) {
    root.classList.add('is-smartphone');
    if (iosLike) {
      enterInlineFullscreen(root);
      updateFullscreenIcon();
    }
    window.addEventListener('orientationchange', handleOrientationChange);
    disposers.push(() => window.removeEventListener('orientationchange', handleOrientationChange));

    (async () => {
      try {
        await enterSmartphoneFullscreen({ root, onError: () => {} });
        orientationLocked = true;
        if (!isLandscape()) {
          showOrientationGate();
        }
      } catch {
        showOrientationGate();
      }
    })();
  }

  const menuButtonContainer = root.querySelector('.vanta-player-controls-right');
  const menuOverlayContainer = root.querySelector('.vanta-player-shell');

  const qualityMenu = watchParty?.disableQualityMenu
    ? { update: () => {} }
    : createQualityMenu({
        buttonContainer: menuButtonContainer,
        menuContainer: menuOverlayContainer,
        onSelect: async profileId => {
          const currentPlayback = sourceSwitch.getCurrentPlayback();
          if (!currentPlayback) return;
          try {
            const playback = await resolvePlayback('auto', { qualityProfile: profileId });
            if (destroyed) return;
            await sourceSwitch.switchTo(playback, {
              position: sourceSwitch.captureState().position,
              shouldPlay: sourceSwitch.getIntendsToPlay(),
              label: 'Qualität wird gewechselt …'
            });
            if (destroyed) return;
            updateMenus(playback);
          } catch (error) {
            if (!destroyed) showError(error.message);
          }
        }
      });

  const subtitleMenu = createSubtitleMenu({
    buttonContainer: menuButtonContainer,
    menuContainer: menuOverlayContainer,
    player,
    reporter
  });

  const participantsMenu = watchParty?.enabled
    ? createWatchPartyParticipantsMenu({
        buttonContainer: menuButtonContainer,
        menuContainer: menuOverlayContainer,
        watchParty
      })
    : null;

  const episodeBrowserMenu = episodeBrowser?.enabled
    ? createEpisodeBrowser({
        buttonContainer: menuButtonContainer,
        menuContainer: menuOverlayContainer,
        context: episodeBrowser.context,
        readonly: Boolean(episodeBrowser.readonly),
        onSelectEpisode: episodeBrowser.onSelectEpisode
      })
    : null;

  const nextEpisodeGate = createNextEpisodeGate();

  const nextEpisodePrompt = episodeBrowser?.enabled
    ? createNextEpisodePrompt({
        root: menuOverlayContainer,
        onConfirm: next => {
          episodeBrowser.onNextEpisode?.(next);
        },
        onDismiss: () => {
          nextEpisodeGate.markDismissed(episodeBrowser.context?.currentEpisodeId);
        }
      })
    : null;

  const maybeShowNextEpisodePrompt = () => {
    if (!nextEpisodePrompt || !episodeBrowser?.context) return;

    const currentEpisodeId = episodeBrowser.context.currentEpisodeId;
    if (!nextEpisodeGate.shouldTrigger(currentEpisodeId)) return;
    if (!shouldShowNextEpisodePrompt({
      currentTime: player.currentTime,
      duration: knownDuration || player.duration,
      threshold: NEXT_EPISODE_THRESHOLD
    })) return;

    const next = findNextEpisode(episodeBrowser.context, currentEpisodeId);
    if (!next) return;

    nextEpisodeGate.markShown(currentEpisodeId);
    const interactive = canStartNextEpisode(watchParty);
    nextEpisodePrompt.show(next, {
      interactive,
      message: interactive ? null : NEXT_EPISODE_VIEWER_MESSAGE
    });
  };

  const updateMenus = (playback, options = {}) => {
    qualityMenu.update(playback.quality.profiles, playback.quality.current);
    subtitleMenu.update(playback, {
      preserveSelection: options.preserveSubtitleSelection !== false
    });
  };

  const listen = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    disposers.push(() => target.removeEventListener(event, handler, options));
  };

  const handlePlaybackFailure = async error => {
    if (sourceSwitch.isSwitching() || destroyed) return;
    if (sourceSwitch.getCurrentPlayback()?.delivery !== 'hls') {
      await switchToHls(error, { silent: isDeferredReadyRoom() });
      return;
    }
    showError(error?.message);
  };

  const switchToHls = async (reason, { silent = false } = {}) => {
    if (fallbackAttempted || destroyed) {
      if (!silent) showError(reason?.message);
      return;
    }
    fallbackAttempted = true;
    const state = sourceSwitch.captureState();
    setLoading(true, 'HLS-Fallback wird beim Server angefragt …');

    try {
      const hlsPlayback = await resolvePlayback('hls');
      if (destroyed) return;
      await sourceSwitch.loadPlayback(hlsPlayback, {
        position: state.position,
        shouldPlay: silent ? false : state.shouldPlay,
        label: 'Stream wird gewechselt …'
      });
      updateMenus(hlsPlayback);
    } catch (error) {
      if (destroyed) return;
      if (!silent) showError(error.message);
    }
  };

  const startWaitingTimeout = () => {
    if (sourceSwitch.isSwitching() || destroyed) return;
    clearWaitingTimer();
    ui.setState('buffering');
    setInlineLoading(true);
    waitingTimer = window.setTimeout(() => {
      waitingTimer = null;
      handlePlaybackFailure(new Error('Der Medienstrom antwortet nicht rechtzeitig.'));
    }, 25_000);
  };

  const handleWheel = event => {
    if (watchParty?.enabled && !canControlWatchParty()) return;
    if (!supportsFinePointer() || Math.abs(event.deltaY) < 4) return;
    const now = performance.now();
    if (now - lastWheelSeekAt < WHEEL_SEEK_DEBOUNCE_MS) return;
    lastWheelSeekAt = now;
    event.preventDefault();
    const direction = event.deltaY > 0 ? 10 : -10;
    seekBy(player, direction, { endEpsilon: 0.25 });
  };

  listen(player, 'provider-change', event => {
    syncInlinePlayback();
    window.setTimeout(syncInlinePlayback, 0);
    if (isHLSProvider(event.detail)) {
      event.detail.library = Hls;
      event.detail.config = {
        enableWorker: true,
        backBufferLength: 30,
        manifestLoadingTimeOut: 30_000,
        levelLoadingTimeOut: 30_000,
        fragLoadingTimeOut: HLS_FRAGMENT_TIMEOUT_MS,
        fragLoadingMaxRetry: 2,
        fragLoadingRetryDelay: 1_000,
        fragLoadingMaxRetryTimeout: 10_000
      };
      if (sourceSwitch.isSwitching()) setLoadingStatus('HLS-Wiedergabe wird initialisiert …');
    }
  });
  listen(player, 'can-play', syncInlinePlayback);
  listen(player, 'loaded-metadata', syncInlinePlayback);

  listen(player, 'error', event => {
    if (sourceSwitch.isSwitching() || destroyed) return;
    const detail = event.detail || {};
    const message = detail.message || 'Wiedergabefehler';
    const isFatalCode = detail.code >= 2 && detail.code <= 4;
    if (isFatalCode || /not supported|decode|network|media_err/i.test(message)) {
      handlePlaybackFailure(new Error(message));
    }
  });

  listen(player, 'duration-change', event => {
    const duration = Number(event.detail);
    if (Number.isFinite(duration) && duration > 0) knownDuration = duration;
  });

  listen(player, 'time-update', maybeShowNextEpisodePrompt);

  listen(player, 'play', () => {
    if (!sourceSwitch.isSwitching()) sourceSwitch.setIntendsToPlay(true);
  });

  listen(player, 'pause', () => {
    if (!sourceSwitch.isSwitching()) {
      sourceSwitch.setIntendsToPlay(false);
      clearWaitingTimer();
      sourceSwitch.clearSeekTimer();
      setInlineLoading(false);
      ui.setState('ready-paused');
    }
  });

  listen(player, 'waiting', () => {
    if (!sourceSwitch.isSwitching()) startWaitingTimeout();
  });

  listen(player, 'seeking', () => {
    if (!sourceSwitch.isSwitching()) {
      ui.setState('seeking');
      setInlineLoading(true);
      sourceSwitch.startSeekTimer();
    }
  });

  listen(player, 'playing', () => {
    clearWaitingTimer();
    sourceSwitch.clearSeekTimer();
    if (!sourceSwitch.isSwitching()) {
      sourceSwitch.setAutoplayBlocked(false);
      setLoading(false);
      setInlineLoading(false);
      sourceSwitch.syncPlayingState();
    }
  });

  listen(player, 'seeked', () => {
    sourceSwitch.clearSeekTimer();
    if (!sourceSwitch.isSwitching() && !destroyed) {
      setInlineLoading(false);
      sourceSwitch.syncPlayingState();
    }
  });

  listen(player, 'play', () => {
    if (canEmitOwnerControl()) {
      watchParty.onOwnerPlay?.(Math.round(player.currentTime * 1000));
    }
  });

  listen(player, 'pause', () => {
    if (canEmitOwnerControl()) {
      watchParty.onOwnerPause?.(Math.round(player.currentTime * 1000));
    }
  });

  listen(player, 'seeked', () => {
    if (canEmitOwnerControl()) {
      watchParty.onOwnerSeek?.(Math.round(player.currentTime * 1000));
    }
  });

  listen(player, 'ended', () => {
    exitPictureInPicture().catch(() => {});
    reporter.stop({ ended: true });
  });
  listen(player, 'wheel', handleWheel, { passive: false });
  listen(dom.backButton, 'click', onBack);
  listen(dom.errorBackButton, 'click', onBack);

  listen(dom.retryButton, 'click', async () => {
    hideError();
    fallbackAttempted = false;
    const position = Math.max(reporter.getPosition(), sourceSwitch.getLastRequestedPosition());
    try {
      const mode = sourceSwitch.getCurrentPlayback()?.delivery === 'hls' ? 'hls' : 'auto';
      const playback = await resolvePlayback(mode);
      await sourceSwitch.switchTo(playback, { position, shouldPlay: true, label: 'Stream wird neu geladen …' });
      updateMenus(playback);
    } catch (error) {
      if (!destroyed) showError(error.message);
    }
  });

  let initialPlaybackPrepared = false;
  let initialPlaybackPromise = null;

  async function prepareInitialPlayback({ position = resumePosition } = {}) {
    if (initialPlaybackPrepared) return;
    if (initialPlaybackPromise) return initialPlaybackPromise;

    // Loading a fresh source can itself fire native play/pause/seeked events (e.g. the
    // <media-player autoplay> attribute racing with our own shouldPlay bookkeeping) well
    // outside the window applyRemoteControl() guards. Without suppression here, the watch
    // party owner's own boot would get echoed back to the server as a manual OWNER_PLAY/
    // OWNER_SEEK, producing phantom notifications and bogus party-state changes.
    const suppressOwnerEcho = Boolean(watchParty?.enabled);
    if (suppressOwnerEcho) beginOwnerEchoSuppression();

    initialPlaybackPromise = (async () => {
      const bootShouldPlay = !watchParty?.enabled;
      setLoading(true, 'Wiedergabequelle wird beim Server angefragt …');
      const initialPlayback = await resolvePlayback('auto');
      if (!destroyed) {
        await sourceSwitch.loadPlayback(initialPlayback, {
          position,
          shouldPlay: bootShouldPlay,
          isBoot: true
        });
        updateMenus(initialPlayback, { preserveSubtitleSelection: false });
        initialPlaybackPrepared = true;
      }
    })();

    try {
      await initialPlaybackPromise;
    } catch (error) {
      initialPlaybackPromise = null;
      if (!destroyed) {
        if (sourceSwitch.getCurrentPlayback()?.delivery !== 'hls') {
          await switchToHls(error, { silent: isDeferredReadyRoom() });
          if (!destroyed && sourceSwitch.getCurrentPlayback()) {
            initialPlaybackPrepared = true;
            if (suppressOwnerEcho) endOwnerEchoSuppression();
            return;
          }
        }
        if (!isDeferredReadyRoom()) showError(error.message);
      }
      if (suppressOwnerEcho) endOwnerEchoSuppression();
      throw error;
    }

    if (suppressOwnerEcho) endOwnerEchoSuppression();
    return initialPlaybackPromise;
  }

  if (deferInitialLoad) {
    setLoading(false);
  } else {
    try {
      await prepareInitialPlayback({ position: resumePosition });
    } catch {
      // visible error handling happens in prepareInitialPlayback
    }
  }

  return {
    player,
    prepareInitialPlayback,
    updateWatchPartyAccess: nextState => {
      if (!watchParty?.enabled) return;
      Object.assign(watchParty, nextState || {});
      refreshWatchPartyControlAccess();
      participantsMenu?.update?.();
    },
    applyRemoteControl: async ({ action, positionMs, serverTimeMs, playing }) => {
      beginOwnerEchoSuppression();
      try {
        if (action === 'play') forcePlaybackPhase();
        const { targetSeconds, shouldSeek, shouldPlay, shouldPause } = computeRemoteControlTarget({
          action, positionMs, serverTimeMs, playing, currentTime: player.currentTime
        });

        if (shouldSeek) player.currentTime = targetSeconds;

        if (shouldPlay) {
          sourceSwitch.setIntendsToPlay(true);
          await sourceSwitch.startCurrentPlayback();
        } else if (shouldPause) {
          player.pause();
        }
      } finally {
        endOwnerEchoSuppression();
      }
    },
    destroy: () => {
      if (destroyed) return Promise.resolve();
      destroyed = true;
      phoneOrientationActive = false;
      gateActive = false;
      clearWaitingTimer();
      sourceSwitch.clearSeekTimer();

      // Start final reporting before tearing down reporter state so keepalive can flush.
      const stopPromise = reporter.stop({ keepalive: true });

      // Begin PiP cleanup while the video element is still present.
      const pipPromise = exitPictureInPicture().catch(() => {});

      orientationGate.destroy();
      exitInlineFullscreen(root);
      reporter.destroy();
      subtitleMenu.destroy();
      participantsMenu?.destroy();
      episodeBrowserMenu?.destroy();
      nextEpisodePrompt?.destroy();
      ui.destroy();
      disposers.splice(0).forEach(dispose => dispose());
      player.destroy?.();
      root.innerHTML = '';

      // Callers that immediately request a new stream (e.g. next-episode navigation) must
      // await this so the server releases the stream-limit slot before the new one is reserved.
      return Promise.all([
        isPhone ? exitSmartphoneFullscreen().catch(() => {}) : Promise.resolve(),
        pipPromise,
        stopPromise?.catch(() => {})
      ]).catch(() => {});
    }
  };
}
