import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { formatTime } from '../utils/format.js';

export default function PlayerPage({ id }) {
  let controlTimeout = null;
  let isMuted = false;
  let savedVolume = 0.8;
  let mediaDuration = 0; // True duration in seconds from metadata

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
        fullscreenBtn
      )
    )
  );

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

  const resetControlTimeout = () => {
    controls.classList.remove('hidden-controls');
    document.body.style.cursor = 'default';

    if (controlTimeout) clearTimeout(controlTimeout);

    controlTimeout = setTimeout(() => {
      if (!video.paused) {
        controls.classList.add('hidden-controls');
        document.body.style.cursor = 'none';
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

  window.addEventListener('mousemove', (e) => {
    if (isDragging) seek(e);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

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

  const handleFullscreenChange = () => {
    if (document.fullscreenElement) {
      fullscreenBtn.innerHTML = fullscreenExitIcon;
    } else {
      fullscreenBtn.innerHTML = fullscreenEnterIcon;
    }
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);

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
  video.addEventListener('error', () => {
    loader.classList.add('hidden');
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
  };

  const cleanupAndGoBack = () => {
    video.pause();
    video.src = '';
    video.load();

    window.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    
    if (controlTimeout) clearTimeout(controlTimeout);
    document.body.style.cursor = 'default';

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    window.history.back();
  };

  backBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cleanupAndGoBack();
  });

  const initPlayer = async () => {
    loader.classList.remove('hidden');
    try {
      let item = await MediaApi.getItem(id);
      let playableId = id;

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
          throw new Error('Keine Staffeln fuer diese Serie gefunden.');
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

      video.src = MediaApi.getStreamUrl(playableId);
      video.load();

      video.play().catch(err => {
        console.warn('Autoplay blocked by browser. User action required.', err);
      });

    } catch (err) {
      console.error('[Player Initialisation Error]', err);
      loader.classList.add('hidden');
      showError('Ladefehler', err.message || 'Der Medienstrom konnte nicht geladen werden.');
    }
  };

  // Synchronise starting volume UI and video volume
  updateVolume(0.8);
  initPlayer();

  container.appendChild(video);
  container.appendChild(controls);
  container.appendChild(backBtn);
  container.appendChild(loader);
  container.appendChild(errorOverlay);

  return container;
}
