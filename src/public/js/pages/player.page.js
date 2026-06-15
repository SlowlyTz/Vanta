import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { PLAYBACK_MODES, settingsStore } from '../store/settings.store.js';
import { formatTime } from '../utils/format.js';

const STREAM_METHOD_OPTIONS = [
  {
    value: PLAYBACK_MODES.TRANSCODE,
    label: 'Immer transkodieren',
    platform: 'iOS',
    recommended: true,
    description: 'Jellyfin wandelt Video und Audio in ein kompatibles Format um. Beste Wahl für iPhone und iPad.'
  },
  {
    value: PLAYBACK_MODES.DIRECT,
    label: 'Direktstream',
    platform: 'Android',
    recommended: true,
    description: 'Nutzt den originalen Stream, wenn Android ihn abspielen kann. Spart Serverleistung und startet oft schneller.'
  },
  {
    value: PLAYBACK_MODES.COMPATIBLE,
    label: 'Automatisch',
    platform: null,
    recommended: false,
    description: 'Die App entscheidet anhand von Browser und Medienformat zwischen Direktstream und Transcoding.'
  }
];

const getStreamMethodOption = (mode) =>
  STREAM_METHOD_OPTIONS.find(option => option.value === mode) || STREAM_METHOD_OPTIONS[0];

export default function PlayerPage({ id }) {
  let controlTimeout = null;
  let streamMenuCloseTimeout = null;
  let isMuted = false;
  let savedVolume = 0.8;
  let mediaDuration = 0; // True duration in seconds from metadata
  let playableId = id;
  let activePlaybackMode = settingsStore.getPlaybackMode();
  let playbackLoadVersion = 0;
  let fallbackAttempted = false;
  let isCleaningUp = false;
  let streamMenuOpen = false;
  let scrollLockY = 0;

  const container = createElement('div', { className: 'player-page' });

  // Native HTML5 Video Element with default 80% volume, not muted
  const video = createElement('video', {
    className: 'player-video',
    preload: 'auto',
    playsinline: true
  });
  video.volume = 0.8;

  // Player DOM elements
  const playPauseBtn = createElement('button', { className: 'player-btn' });
  const timeElapsed = createElement('span', {}, '00:00');
  const timeDuration = createElement('span', {}, '00:00');
  const progressFill = createElement('div', { className: 'player-progress-fill' });
  const bufferFill = createElement('div', { className: 'player-buffer-fill' });
  const progressHandle = createElement('div', { className: 'player-progress-handle' });
  const volumeBtn = createElement('button', { className: 'player-btn' });
  
  // Volume slider starting at 0.8
  const volumeSlider = createElement('input', {
    type: 'range',
    className: 'player-volume-slider',
    min: '0',
    max: '1',
    step: '0.05',
    value: '0.8'
  });

  const fullscreenBtn = createElement('button', { className: 'player-btn' });
  const backBtn = createElement('button', { className: 'player-back-btn' });
  const streamMenuButtonLabel = createElement('span', { className: 'player-stream-button-label' });
  const streamMenuButton = createElement('button', {
    className: 'player-stream-button',
    type: 'button',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false'
  },
    createElement('span', { className: 'player-stream-button-kicker' }, 'Stream'),
    streamMenuButtonLabel
  );
  const streamMenuItems = [];
  const streamMenu = createElement('div', {
    className: 'player-stream-menu',
    role: 'menu',
    hidden: true
  },
    createElement('div', { className: 'player-stream-menu-header' },
      createElement('div', { className: 'player-stream-menu-title' }, 'Stream-Methode'),
      createElement('div', { className: 'player-stream-menu-copy' },
        'Ändert, ob Jellyfin direkt streamt oder das Video in ein kompatibles Format umwandelt.'
      )
    ),
    STREAM_METHOD_OPTIONS.map(option => {
      const check = createElement('span', { className: 'player-stream-option-check' });
      check.innerHTML = `<svg viewBox="0 0 24 24"><path d="m20 6-11 11-5-5"/></svg>`;

      const item = createElement('button', {
        className: 'player-stream-option',
        type: 'button',
        role: 'menuitemradio',
        'aria-checked': 'false',
        onClick: async (event) => {
          event.stopPropagation();
          await applyPlaybackMode(option.value);
        }
      },
        createElement('span', { className: 'player-stream-option-main' },
          createElement('span', { className: 'player-stream-option-title' },
            option.label,
            option.platform ? createElement('span', { className: 'player-stream-option-platform' }, `(${option.platform})`) : null,
            option.recommended ? createElement('span', { className: 'player-stream-recommend' }, 'Recommend') : null
          ),
          createElement('span', { className: 'player-stream-option-description' }, option.description)
        ),
        check
      );

      streamMenuItems.push({ item, check, value: option.value });
      return item;
    })
  );
  const streamMenuWrapper = createElement('div', { className: 'player-stream-menu-wrapper' },
    streamMenuButton,
    streamMenu
  );
  
  const loader = createElement('div', { className: 'player-loader hidden' },
    createElement('div', { className: 'player-loader-spinner' })
  );
  
  const errorOverlay = createElement('div', { className: 'player-error hidden' });

  const timeline = createElement('div', { className: 'player-timeline' },
    bufferFill,
    progressFill,
    progressHandle
  );

  const controls = createElement('div', { className: 'player-controls' },
    createElement('div', { className: 'player-timeline-container' },
      timeline,
      createElement('div', { className: 'player-time-row' },
        timeElapsed,
        timeDuration
      )
    ),
    createElement('div', { className: 'player-buttons-row' },
      createElement('div', { className: 'player-controls-left' },
        playPauseBtn,
        createElement('div', { className: 'player-volume-container' },
          volumeBtn,
          volumeSlider
        )
      ),
      createElement('div', { className: 'player-controls-right' },
        streamMenuWrapper,
        fullscreenBtn
      )
    )
  );
  const topbar = createElement('div', { className: 'player-topbar' }, backBtn);
  const stage = createElement('div', { className: 'player-stage' }, video);

  // SVGs
  const playIcon = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
  const pauseIcon = `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  const volumeHighIcon = `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
  const volumeMutedIcon = `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
  const fullscreenEnterIcon = `<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
  const fullscreenExitIcon = `<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`;
  const backIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`;

  playPauseBtn.innerHTML = playIcon;
  volumeBtn.innerHTML = volumeHighIcon;
  fullscreenBtn.innerHTML = fullscreenEnterIcon;
  backBtn.innerHTML = `${backIcon}Zurück`;

  const showControls = () => {
    controls.classList.remove('hidden-controls');
    topbar.classList.remove('hidden-controls');
    document.body.style.cursor = 'default';
  };

  const hideControls = () => {
    if (streamMenuOpen) return;
    controls.classList.add('hidden-controls');
    topbar.classList.add('hidden-controls');
    document.body.style.cursor = 'none';
  };

  const resetControlTimeout = () => {
    showControls();

    if (controlTimeout) clearTimeout(controlTimeout);

    controlTimeout = setTimeout(() => {
      if (!video.paused) {
        hideControls();
      }
    }, 3500);
  };

  container.addEventListener('mousemove', resetControlTimeout);
  container.addEventListener('click', resetControlTimeout);

  const togglePlay = () => {
    if (video.paused) {
      video.play().catch(err => console.error('Video play error:', err));
    } else {
      video.pause();
    }
  };

  playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  video.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  video.addEventListener('play', () => {
    playPauseBtn.innerHTML = pauseIcon;
    resetControlTimeout();
  });

  video.addEventListener('pause', () => {
    playPauseBtn.innerHTML = playIcon;
    controls.classList.remove('hidden-controls');
    document.body.style.cursor = 'default';
    if (controlTimeout) clearTimeout(controlTimeout);
  });

  video.addEventListener('timeupdate', () => {
    const duration = mediaDuration || video.duration;
    if (duration) {
      const current = video.currentTime;
      timeElapsed.textContent = formatTime(current);
      timeDuration.textContent = formatTime(duration);

      const percent = (current / duration) * 100;
      progressFill.style.width = `${percent}%`;
      progressHandle.style.left = `${percent}%`;
    }
  });

  video.addEventListener('progress', () => {
    const duration = mediaDuration || video.duration;
    if (duration && video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      bufferFill.style.width = `${(bufferedEnd / duration) * 100}%`;
    }
  });

  video.addEventListener('loadedmetadata', () => {
    if (!mediaDuration && video.duration) {
      timeDuration.textContent = formatTime(video.duration);
    }
  });

  const seek = (e) => {
    const rect = timeline.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const duration = mediaDuration || video.duration;
    if (duration) {
      video.currentTime = pos * duration;
    }
  };

  timeline.addEventListener('click', (e) => {
    e.stopPropagation();
    seek(e);
  });

  let isDragging = false;
  timeline.addEventListener('mousedown', (e) => {
    isDragging = true;
    seek(e);
  });

  const handleWindowMouseMove = (e) => {
    if (isDragging) seek(e);
  };

  const handleWindowMouseUp = () => {
    isDragging = false;
  };

  window.addEventListener('mousemove', handleWindowMouseMove);
  window.addEventListener('mouseup', handleWindowMouseUp);

  const updateVolume = (val) => {
    video.volume = val;
    volumeSlider.value = val;
    isMuted = val === 0;

    if (isMuted) {
      volumeBtn.innerHTML = volumeMutedIcon;
    } else {
      volumeBtn.innerHTML = volumeHighIcon;
    }
  };

  volumeSlider.addEventListener('input', (e) => {
    e.stopPropagation();
    updateVolume(parseFloat(e.target.value));
  });

  volumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isMuted) {
      updateVolume(savedVolume);
    } else {
      savedVolume = video.volume > 0 ? video.volume : 0.8;
      updateVolume(0);
    }
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error('Fullscreen failed:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen();
  });

  const isHoverStreamMenu = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const updateStreamMenuState = () => {
    const currentMode = activePlaybackMode || settingsStore.getPlaybackMode();
    const currentOption = getStreamMethodOption(currentMode);
    streamMenuButtonLabel.textContent = currentOption.platform
      ? `${currentOption.label} (${currentOption.platform})`
      : currentOption.label;

    streamMenuItems.forEach(({ item, value }) => {
      const active = value === currentMode;
      item.classList.toggle('active', active);
      item.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  };

  const setStreamMenuOpen = (open) => {
    if (streamMenuOpen === open) return;

    streamMenuOpen = open;
    streamMenu.hidden = !open;
    streamMenuWrapper.classList.toggle('open', open);
    streamMenuButton.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (open) {
      showControls();
      if (controlTimeout) clearTimeout(controlTimeout);
    } else if (!isCleaningUp) {
      resetControlTimeout();
    }
  };

  const closeStreamMenuSoon = () => {
    if (streamMenuCloseTimeout) clearTimeout(streamMenuCloseTimeout);
    streamMenuCloseTimeout = setTimeout(() => setStreamMenuOpen(false), 140);
  };

  const applyPlaybackMode = async (mode) => {
    settingsStore.setPlaybackMode(mode);
    fallbackAttempted = false;
    setStreamMenuOpen(false);

    if (!playableId) return;

    try {
      await loadPlaybackSource(playableId, mode, {
        autoplay: true,
        preserveTime: true
      });
    } catch (error) {
      loader.classList.add('hidden');
      showError('Ladefehler', error.message || 'Der Medienstrom konnte nicht geladen werden.');
    }
  };

  streamMenuWrapper.addEventListener('mouseenter', () => {
    if (!isHoverStreamMenu()) return;
    if (streamMenuCloseTimeout) clearTimeout(streamMenuCloseTimeout);
    setStreamMenuOpen(true);
  });

  streamMenuWrapper.addEventListener('mouseleave', () => {
    if (!isHoverStreamMenu()) return;
    closeStreamMenuSoon();
  });

  streamMenuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setStreamMenuOpen(!streamMenuOpen);
  });

  streamMenuButton.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setStreamMenuOpen(!streamMenuOpen);
    }

    if (event.key === 'Escape') {
      setStreamMenuOpen(false);
    }
  });

  streamMenu.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  const handleDocumentPointerDown = (event) => {
    if (!streamMenuOpen || streamMenuWrapper.contains(event.target)) return;
    setStreamMenuOpen(false);
  };

  document.addEventListener('pointerdown', handleDocumentPointerDown);

  const handleFullscreenChange = () => {
    if (document.fullscreenElement) {
      fullscreenBtn.innerHTML = fullscreenExitIcon;
    } else {
      fullscreenBtn.innerHTML = fullscreenEnterIcon;
    }
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);

  const unsubscribeSettings = settingsStore.subscribe(updateStreamMenuState);

  const handleKeyDown = (e) => {
    resetControlTimeout();
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        const duration = mediaDuration || video.duration;
        video.currentTime = Math.min(duration, video.currentTime + 10);
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  // Buffer loading state
  video.addEventListener('waiting', () => {
    loader.classList.remove('hidden');
  });

  video.addEventListener('playing', () => {
    loader.classList.add('hidden');
  });

  video.addEventListener('seeking', () => {
    loader.classList.remove('hidden');
  });

  video.addEventListener('seeked', () => {
    loader.classList.add('hidden');
  });

  // HTML5 Media Errors
  video.addEventListener('error', async () => {
    if (isCleaningUp) return;

    loader.classList.add('hidden');
    if (playableId && activePlaybackMode !== PLAYBACK_MODES.TRANSCODE && !fallbackAttempted) {
      fallbackAttempted = true;

      try {
        await loadPlaybackSource(playableId, PLAYBACK_MODES.TRANSCODE, {
          autoplay: true,
          preserveTime: true
        });
        return;
      } catch (fallbackError) {
        console.error('[Player Fallback Error]', fallbackError);
      }
    }

    const err = video.error;
    let msg = 'Ein unbekannter Stream-Fehler ist aufgetreten.';
    if (err) {
      switch (err.code) {
        case err.MEDIA_ERR_ABORTED:
          msg = 'Die Wiedergabe wurde abgebrochen.';
          break;
        case err.MEDIA_ERR_NETWORK:
          msg = 'Ein Netzwerkfehler hat das Laden des Videos verhindert.';
          break;
        case err.MEDIA_ERR_DECODE:
          msg = 'Das Video ist beschädigt oder kann nicht dekodiert werden.';
          break;
        case err.MEDIA_ERR_SRC_NOT_SUPPORTED:
          msg = 'Dieses Videoformat oder Audio-Codec wird vom Browser nicht unterstützt.';
          break;
      }
    }
    showError('Wiedergabefehler', msg);
  });

  const showError = (title, msg) => {
    errorOverlay.innerHTML = '';
    errorOverlay.appendChild(createElement('div', { className: 'player-error-title' }, title));
    errorOverlay.appendChild(createElement('div', { className: 'player-error-msg' }, msg));

    const backToDetailBtn = createElement('button', {
      className: 'btn-primary',
      onClick: () => cleanupAndGoBack()
    }, 'Zurück');

    errorOverlay.appendChild(backToDetailBtn);
    errorOverlay.classList.remove('hidden');
    controls.classList.add('hidden-controls');
    topbar.classList.add('hidden-controls');
  };

  const handleTouchMove = (event) => {
    if (event.target.closest('.player-controls, .player-topbar, .player-error')) return;
    event.preventDefault();
  };

  const lockPlayerViewport = () => {
    scrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add('player-active');
    document.body.classList.add('player-active');
    document.body.style.top = `-${scrollLockY}px`;
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
  };

  const unlockPlayerViewport = () => {
    window.removeEventListener('touchmove', handleTouchMove);
    document.documentElement.classList.remove('player-active');
    document.body.classList.remove('player-active');
    document.body.style.top = '';
    window.scrollTo(0, scrollLockY);
  };

  const cleanupPlayer = () => {
    if (isCleaningUp) return;
    isCleaningUp = true;
    video.pause();
    video.src = '';
    video.load();

    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', handleWindowMouseUp);
    window.removeEventListener('hashchange', handleHashChange);
    document.removeEventListener('pointerdown', handleDocumentPointerDown);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    unsubscribeSettings();
    
    if (controlTimeout) clearTimeout(controlTimeout);
    if (streamMenuCloseTimeout) clearTimeout(streamMenuCloseTimeout);
    setStreamMenuOpen(false);
    unlockPlayerViewport();
    document.body.style.cursor = 'default';

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const cleanupAndGoBack = () => {
    cleanupPlayer();
    window.history.back();
  };

  const handleHashChange = () => {
    if (!window.location.hash.startsWith('#/player')) {
      cleanupPlayer();
    }
  };

  window.addEventListener('hashchange', handleHashChange);

  backBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cleanupAndGoBack();
  });

  const initPlayer = async () => {
    loader.classList.remove('hidden');
    try {
      let item = await MediaApi.getItem(id);
      playableId = id;

      if (item.Type === 'Series') {
        const seasons = await MediaApi.getSeasons(id);
        if (seasons && seasons.length > 0) {
          const episodes = await MediaApi.getEpisodes(id, seasons[0].Id);
          if (episodes && episodes.length > 0) {
            const unplayed = episodes.find(e => e.UserData && !e.UserData.Played);
            playableId = unplayed ? unplayed.Id : episodes[0].Id;
            item = await MediaApi.getItem(playableId);
          } else {
            throw new Error('Keine Episoden in der ersten Staffel dieser Serie gefunden.');
          }
        } else {
          throw new Error('Keine Staffeln für diese Serie gefunden.');
        }
      } else if (item.Type === 'Season') {
        const seriesId = item.SeriesId;
        if (!seriesId) {
          throw new Error('Hauptserien-ID konnte nicht ermittelt werden.');
        }
        const episodes = await MediaApi.getEpisodes(seriesId, id);
        if (episodes && episodes.length > 0) {
          const unplayed = episodes.find(e => e.UserData && !e.UserData.Played);
          playableId = unplayed ? unplayed.Id : episodes[0].Id;
          item = await MediaApi.getItem(playableId);
        } else {
          throw new Error('Keine Episoden in dieser Staffel gefunden.');
        }
      }

      // Extract duration from metadata (Jellyfin ticks to seconds)
      if (item.RunTimeTicks) {
        mediaDuration = item.RunTimeTicks / 10000000;
        timeDuration.textContent = formatTime(mediaDuration);
      }

      fallbackAttempted = false;
      await loadPlaybackSource(playableId, settingsStore.getPlaybackMode(), {
        autoplay: true
      });

    } catch (err) {
      console.error('[Player Initialisation Error]', err);
      loader.classList.add('hidden');
      showError('Ladefehler', err.message || 'Der Medienstrom konnte nicht geladen werden.');
    }
  };

  const loadPlaybackSource = async (id, mode = settingsStore.getPlaybackMode(), options = {}) => {
    const { autoplay = true, preserveTime = false } = options;
    const loadVersion = ++playbackLoadVersion;
    const resumeTime = preserveTime && Number.isFinite(video.currentTime) ? video.currentTime : 0;

    activePlaybackMode = mode;
    updateStreamMenuState();
    loader.classList.remove('hidden');
    errorOverlay.classList.add('hidden');

    const playback = await MediaApi.getPlayback(id, mode);
    if (loadVersion !== playbackLoadVersion) return;

    video.src = playback.url;

    if (resumeTime > 0) {
      video.addEventListener('loadedmetadata', () => {
        const duration = mediaDuration || video.duration;
        if (duration && resumeTime < duration) {
          video.currentTime = resumeTime;
        }
      }, { once: true });
    }

    video.load();

    if (autoplay) {
      video.play().catch(err => {
        console.warn('Autoplay blocked by browser. User action required.', err);
      });
    }
  };

  // Synchronise starting volume UI and video volume
  updateVolume(0.8);
  updateStreamMenuState();
  lockPlayerViewport();
  initPlayer();

  container.appendChild(stage);
  container.appendChild(topbar);
  container.appendChild(controls);
  container.appendChild(loader);
  container.appendChild(errorOverlay);

  return container;
}
