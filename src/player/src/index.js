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
import 'vidstack/define/media-gesture.js';
import 'vidstack/styles/defaults.css';
import './player.css';

import { createJellyfinReporter } from './jellyfinReporter.js';
import { isIOSLike, supportsFinePointer, canRequestFullscreen } from './platform.js';
import { seekBy, clampSeekTarget } from './seek.js';
import { once } from './promiseHelpers.js';
import { createPlayerUi } from './ui/playerUi.js';

const LOAD_TIMEOUT_MS = 25_000;
const SEEK_TIMEOUT_MS = 6_000;
const DIRECT_FIRST_FRAME_TIMEOUT_MS = 30_000;
const HLS_FIRST_FRAME_TIMEOUT_MS = 210_000;
const HLS_FRAGMENT_TIMEOUT_MS = 90_000;
const END_EPSILON_SECONDS = 0.25;
const WHEEL_SEEK_DEBOUNCE_MS = 320;
const POSTER_FALLBACK_GRADIENT = 'radial-gradient(circle at 50% 50%, #1a1a20 0%, #050505 100%)';

function formatLoadingPosition(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = value % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

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
  fullscreenExit: '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'
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

const playbackSource = playback => ({
  src: playback.url,
  type: playback.delivery === 'hls'
    ? 'application/vnd.apple.mpegurl'
    : 'video/mp4'
});

function createPlayerMarkup(root, { title, poster }) {
  const escapedTitle = title ? escapeHtml(title) : '';

  root.innerHTML = `
    <div class="vanta-player-shell">
      <media-player class="vanta-media-player" aria-label="Videoplayer">
        <media-outlet></media-outlet>

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
                <media-fullscreen-button class="vanta-player-fullscreen-button" aria-label="Vollbild">
                  ${svgIcon('fullscreenEnter', 'enter')}
                  ${svgIcon('fullscreenExit', 'exit')}
                </media-fullscreen-button>
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
  onBack
}) {
  await customElements.whenDefined('media-player');

  const dom = createPlayerMarkup(root, { title, poster });
  const { player } = dom;
  const disposers = [];
  const ui = createPlayerUi(root);

  let destroyed = false;
  let currentPlayback = null;
  let switching = false;
  let fallbackAttempted = false;
  let loadVersion = 0;
  let knownDuration = 0;
  let intendsToPlay = true;
  let lastRequestedPosition = Math.max(0, Number(resumePosition) || 0);
  let waitingTimer = null;
  let seekTimer = null;
  let lastWheelSeekAt = 0;
  let lastSeekTarget = 0;
  let seekVersion = 0;
  let autoplayBlocked = false;

  if (isIOSLike()) root.classList.add('is-ios');
  if (!canRequestFullscreen()) root.classList.add('no-native-fullscreen');

  const reporter = createJellyfinReporter({
    player,
    itemId,
    report: reportPlayback
  });

  const listen = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    disposers.push(() => target.removeEventListener(event, handler, options));
  };

  const setLoading = (visible, status) => {
    if (status) dom.loadingStatus.textContent = status;
    dom.loading.classList.toggle('is-hidden', !visible);
  };

  const setLoadingStatus = status => {
    if (status) dom.loadingStatus.textContent = status;
  };

  const setInlineLoading = visible => {
    dom.inlineLoading.hidden = !visible;
  };

  const clearWaitingTimer = () => {
    if (!waitingTimer) return;
    window.clearTimeout(waitingTimer);
    waitingTimer = null;
  };

  const clearSeekTimer = () => {
    if (!seekTimer) return;
    window.clearTimeout(seekTimer);
    seekTimer = null;
  };

  const startSeekTimer = () => {
    clearSeekTimer();
    seekTimer = window.setTimeout(() => {
      seekTimer = null;
      if (!switching && !destroyed) setInlineLoading(false);
    }, SEEK_TIMEOUT_MS);
  };

  const hideError = () => {
    dom.error.hidden = true;
  };

  const showError = message => {
    clearWaitingTimer();
    clearSeekTimer();
    setLoading(false);
    setInlineLoading(false);
    ui.setState('error');
    dom.errorMessage.textContent = message || 'Der Medienstrom konnte nicht wiedergegeben werden.';
    dom.error.hidden = false;
  };

  const isCurrentLoad = version => !destroyed && version === loadVersion;

  const syncPlayingState = () => {
    if (switching || destroyed) return;
    ui.setState(player.paused ? 'ready-paused' : 'ready-playing-active');
  };

  const waitForPresentedFrame = timeoutMs => new Promise(resolve => {
    const video = player.querySelector('video');
    if (!video) {
      resolve(false);
      return;
    }

    let settled = false;
    let frameId = null;
    let progressHandler = null;
    const timeout = window.setTimeout(() => finish(false), timeoutMs);

    function finish(presented) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (frameId !== null && video.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(frameId);
      }
      if (progressHandler) player.removeEventListener('time-update', progressHandler);
      resolve(presented);
    }

    if (video.requestVideoFrameCallback) {
      frameId = video.requestVideoFrameCallback(() => finish(true));
      return;
    }

    progressHandler = () => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => finish(true)));
    };
    player.addEventListener('time-update', progressHandler, { once: true });
  });

  const applyPlaybackState = async ({ shouldPlay }) => {
    if (destroyed) return;
    if (!shouldPlay) {
      player.paused = true;
      return;
    }
    try {
      setLoadingStatus('Wiedergabe wird gestartet …');
      await player.play();
      autoplayBlocked = false;
      const isHls = currentPlayback?.delivery === 'hls';
      setLoadingStatus(isHls
        ? 'Erstes HLS-Segment wird transkodiert und geladen …'
        : 'Erster Videoframe wird dargestellt …');
      const framePresented = await waitForPresentedFrame(
        isHls ? HLS_FIRST_FRAME_TIMEOUT_MS : DIRECT_FIRST_FRAME_TIMEOUT_MS
      );
      if (!framePresented) {
        throw new Error(isHls
          ? 'Das erste HLS-Segment konnte nicht rechtzeitig geladen werden.'
          : 'Der erste Videoframe konnte nicht rechtzeitig geladen werden.');
      }
    } catch (error) {
      if (error?.name === 'NotAllowedError') {
        autoplayBlocked = true;
        setLoading(false);
        setInlineLoading(false);
      } else {
        throw error;
      }
    }
  };

  const captureState = () => ({
    position: Math.max(reporter.getPosition(), lastRequestedPosition),
    shouldPlay: intendsToPlay,
    volume: Number(player.volume),
    muted: Boolean(player.muted),
    playbackRate: Number(player.playbackRate) || 1
  });

  const restoreState = state => {
    if (destroyed) return;
    if (Number.isFinite(state.volume)) player.volume = state.volume;
    if (Number.isFinite(state.playbackRate) && state.playbackRate > 0) player.playbackRate = state.playbackRate;
    player.muted = Boolean(state.muted);
  };

  const waitForDurationOrSeekable = timeoutMs => new Promise(resolve => {
    const hasDuration = () => Number.isFinite(player.duration) && player.duration > 0;
    const hasSeekable = () => player.seekable?.length > 0 && Number.isFinite(player.seekable.end(0));

    if (hasDuration() || hasSeekable()) {
      resolve();
      return;
    }

    let timeout;
    const cleanup = () => {
      window.clearTimeout(timeout);
      player.removeEventListener('duration-change', onChange);
      player.removeEventListener('loaded-metadata', onChange);
    };

    const onChange = () => {
      if (hasDuration() || hasSeekable()) {
        cleanup();
        resolve();
      }
    };

    timeout = window.setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);

    player.addEventListener('duration-change', onChange);
    player.addEventListener('loaded-metadata', onChange);
  });

  const performSeek = async (targetPosition, { version } = {}) => {
    const target = clampSeekTarget(targetPosition, player, END_EPSILON_SECONDS);
    lastSeekTarget = target;
    lastRequestedPosition = target;
    const currentSeek = ++seekVersion;

    if (switching && target > 0) {
      setLoadingStatus(`Wiedergabeposition ${formatLoadingPosition(target)} wird wiederhergestellt …`);
    }

    if (Math.abs(Number(player.currentTime) - target) < 0.35) {
      if (!switching && !destroyed) {
        setInlineLoading(false);
        syncPlayingState();
      }
      return;
    }

    if (!switching && !destroyed) {
      ui.setState('seeking');
      setInlineLoading(true);
    }
    startSeekTimer();

    const seekedPromise = once(player, 'seeked', SEEK_TIMEOUT_MS);
    player.currentTime = target;

    try {
      await seekedPromise;
    } catch {
      // Seek timeout or error – still clean up below
    } finally {
      if (currentSeek !== seekVersion) return;
      clearSeekTimer();
      if (version !== undefined && !isCurrentLoad(version)) return;
      if (!switching && !destroyed) {
        setInlineLoading(false);
        syncPlayingState();
      }
    }
  };

  const loadPlayback = async (playback, options = {}) => {
    const version = ++loadVersion;
    const previousState = captureState();
    const state = {
      ...previousState,
      position: Math.max(0, Number(options.position) ?? previousState.position),
      shouldPlay: options.shouldPlay !== false,
      label: options.label || 'Video wird geladen …'
    };

    switching = true;
    clearWaitingTimer();
    clearSeekTimer();
    hideError();
    setLoading(true, state.label);
    setInlineLoading(false);
    ui.setState(options.isBoot ? 'booting' : 'switching-source');

    if (currentPlayback) await reporter.beforeSourceSwitch();
    if (!isCurrentLoad(version)) return;

    reporter.afterSourceSwitch();
    currentPlayback = playback;
    lastRequestedPosition = state.position;
    reporter.setPlayback(playback);

    setLoadingStatus(playback.delivery === 'hls'
      ? 'HLS-Stream wird verbunden …'
      : 'Direkter Videostream wird verbunden …');
    player.src = playbackSource(playback);

    try {
      await once(player, 'can-play', LOAD_TIMEOUT_MS, ['error']);
      if (!isCurrentLoad(version)) return;
      setLoadingStatus('Medienquelle ist bereit. Laufzeit wird geprüft …');
      restoreState(state);
      await waitForDurationOrSeekable(3_000);
      if (!isCurrentLoad(version)) return;
      await performSeek(state.position, { version });
      if (!isCurrentLoad(version)) return;
      switching = false;
      await applyPlaybackState({ shouldPlay: state.shouldPlay });
      if (!isCurrentLoad(version)) return;
      if (!switching) {
        setLoading(false);
        syncPlayingState();
      }
    } catch (error) {
      if (!isCurrentLoad(version)) return;
      switching = false;
      await handlePlaybackFailure(error);
    }
  };

  const switchToHls = async reason => {
    if (fallbackAttempted || destroyed) {
      showError(reason?.message);
      return;
    }
    fallbackAttempted = true;
    const state = captureState();
    setLoading(true, 'HLS-Fallback wird beim Server angefragt …');

    try {
      const hlsPlayback = await resolvePlayback('hls');
      if (destroyed) return;
      await loadPlayback(hlsPlayback, {
        position: state.position,
        shouldPlay: state.shouldPlay,
        label: 'Stream wird gewechselt …'
      });
    } catch (error) {
      if (destroyed) return;
      showError(error.message);
    }
  };

  async function handlePlaybackFailure(error) {
    if (switching || destroyed) return;
    if (currentPlayback?.delivery !== 'hls') {
      await switchToHls(error);
      return;
    }
    showError(error?.message);
  }

  const startWaitingTimeout = () => {
    if (switching || destroyed) return;
    clearWaitingTimer();
    ui.setState('buffering');
    setInlineLoading(true);
    waitingTimer = window.setTimeout(() => {
      waitingTimer = null;
      handlePlaybackFailure(new Error('Der Medienstrom antwortet nicht rechtzeitig.'));
    }, LOAD_TIMEOUT_MS);
  };

  const handleWheel = event => {
    if (!supportsFinePointer() || Math.abs(event.deltaY) < 4) return;
    const now = performance.now();
    if (now - lastWheelSeekAt < WHEEL_SEEK_DEBOUNCE_MS) return;
    lastWheelSeekAt = now;
    event.preventDefault();
    const direction = event.deltaY > 0 ? 10 : -10;
    seekBy(player, direction, { endEpsilon: END_EPSILON_SECONDS });
  };

  listen(player, 'provider-change', event => {
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
      if (switching) setLoadingStatus('HLS-Wiedergabe wird initialisiert …');
    }
  });

  listen(player, 'error', event => {
    if (switching || destroyed) return;
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

  listen(player, 'play', () => {
    if (!switching) intendsToPlay = true;
  });

  listen(player, 'pause', () => {
    if (!switching) {
      intendsToPlay = false;
      clearWaitingTimer();
      clearSeekTimer();
      setInlineLoading(false);
      ui.setState('ready-paused');
    }
  });

  listen(player, 'waiting', () => {
    if (!switching) startWaitingTimeout();
  });

  listen(player, 'seeking', () => {
    if (!switching) {
      ui.setState('seeking');
      setInlineLoading(true);
      startSeekTimer();
    }
  });

  listen(player, 'playing', () => {
    clearWaitingTimer();
    clearSeekTimer();
    if (!switching) {
      autoplayBlocked = false;
      setLoading(false);
      setInlineLoading(false);
      syncPlayingState();
    }
  });

  listen(player, 'seeked', () => {
    clearSeekTimer();
    if (!switching && !destroyed) {
      setInlineLoading(false);
      syncPlayingState();
    }
  });

  listen(player, 'ended', () => reporter.stop({ ended: true }));
  listen(player, 'wheel', handleWheel, { passive: false });
  listen(dom.backButton, 'click', onBack);
  listen(dom.errorBackButton, 'click', onBack);

  listen(dom.retryButton, 'click', async () => {
    hideError();
    fallbackAttempted = false;
    const position = Math.max(reporter.getPosition(), lastRequestedPosition);
    try {
      const mode = currentPlayback?.delivery === 'hls' ? 'hls' : 'auto';
      const playback = await resolvePlayback(mode);
      await loadPlayback(playback, { position, shouldPlay: true });
    } catch (error) {
      if (!destroyed) showError(error.message);
    }
  });

  setLoading(true, 'Wiedergabequelle wird beim Server angefragt …');
  const initialPlayback = await resolvePlayback('auto');
  if (!destroyed) {
    await loadPlayback(initialPlayback, {
      position: resumePosition,
      shouldPlay: true,
      isBoot: true
    });
  }

  return {
    player,
    destroy: async () => {
      if (destroyed) return;
      destroyed = true;
      loadVersion += 1;
      clearWaitingTimer();
      clearSeekTimer();
      await reporter.stop({ keepalive: true });
      reporter.destroy();
      ui.destroy();
      disposers.splice(0).forEach(dispose => dispose());
      player.destroy?.();
      root.innerHTML = '';
    }
  };
}
