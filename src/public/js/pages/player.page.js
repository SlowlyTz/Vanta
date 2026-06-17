import { createElement } from '../utils/dom.js';
import { formatTime } from '../utils/format.js';
import { MediaApi } from '../api/media.api.js';
import { settingsStore } from '../store/settings.store.js';
import { createPlayerDom } from './player/playerDom.js';
import { createPlayerControls } from './player/playerControls.js';
import { createStreamMenu } from './player/streamMenu.js';
import { createPlaybackLoader } from './player/playbackLoader.js';
import { createPlayerEvents } from './player/playerEvents.js';

export default function PlayerPage({ id }) {
  let mediaDuration = 0;
  let playableId = id;
  let isCleaningUp = false;
  let scrollLockY = 0;

  const dom = createPlayerDom();
  const {
    container,
    video,
    playPauseBtn,
    timeElapsed,
    timeDuration,
    progressFill,
    bufferFill,
    progressHandle,
    volumeBtn,
    volumeSlider,
    fullscreenBtn,
    backBtn,
    streamMenuButtonLabel,
    streamMenuButton,
    streamMenu,
    streamMenuItems,
    streamMenuWrapper,
    loader,
    errorOverlay,
    timeline,
    controls,
    topbar,
    stage
  } = dom;

  const getDuration = () => mediaDuration || video.duration;
  const getPlayableId = () => playableId;

  const showError = (title, msg) => {
    errorOverlay.innerHTML = '';
    errorOverlay.appendChild(createElement('div', { className: 'player-error-title' }, title));
    errorOverlay.appendChild(createElement('div', { className: 'player-error-msg' }, msg));

    const backToDetailBtn = document.createElement('button');
    backToDetailBtn.className = 'btn-primary';
    backToDetailBtn.textContent = 'Zurück';
    backToDetailBtn.addEventListener('click', cleanupAndGoBack);

    errorOverlay.appendChild(backToDetailBtn);
    errorOverlay.classList.remove('hidden');
    controls.classList.add('hidden-controls');
    topbar.classList.add('hidden-controls');
  };

  const controlsApi = createPlayerControls({
    video,
    playPauseBtn,
    timeline,
    progressFill,
    progressHandle,
    bufferFill,
    timeElapsed,
    timeDuration,
    volumeBtn,
    volumeSlider,
    fullscreenBtn,
    controls,
    topbar,
    container,
    loader,
    getDuration
  });

  const playbackLoader = createPlaybackLoader({
    video,
    loader,
    errorOverlay,
    getDuration,
    onModeChange: updateStreamMenuState,
    showError,
    showControls: controlsApi.showControls
  });

  const streamMenuApi = createStreamMenu({
    streamMenuButton,
    streamMenuButtonLabel,
    streamMenu,
    streamMenuWrapper,
    streamMenuItems,
    getActiveMode: playbackLoader.getActiveMode,
    onSelect: async (mode) => {
      settingsStore.setPlaybackMode(mode);
      playbackLoader.resetFallback();
      streamMenuApi.setStreamMenuOpen(false);
      if (!playableId) return;
      try {
        await playbackLoader.loadPlaybackSource(playableId, mode, {
          autoplay: true,
          preserveTime: true
        });
      } catch (error) {
        loader.classList.add('hidden');
        showError('Ladefehler', error.message || 'Der Medienstrom konnte nicht geladen werden.');
      }
    }
  });

  function updateStreamMenuState() {
    streamMenuApi.updateStreamMenuState();
  }

  const eventsApi = createPlayerEvents({
    video,
    streamMenuWrapper,
    togglePlay: controlsApi.togglePlay,
    setStreamMenuOpen: streamMenuApi.setStreamMenuOpen,
    cleanupPlayer,
    updateFullscreenIcon: controlsApi.updateFullscreenIcon,
    handleVideoError: playbackLoader.handleVideoError,
    playableId,
    getPlayableId,
    resetControlTimeout: controlsApi.resetControlTimeout
  });

  const unsubscribeSettings = settingsStore.subscribe(updateStreamMenuState);

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

  function cleanupPlayer() {
    if (isCleaningUp) return;
    isCleaningUp = true;
    video.pause();
    video.src = '';
    video.load();

    controlsApi.cleanup();
    streamMenuApi.cleanup();
    eventsApi.cleanup();
    unsubscribeSettings();

    document.body.style.cursor = 'default';
    unlockPlayerViewport();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function cleanupAndGoBack() {
    cleanupPlayer();
    window.history.back();
  }

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
        if (!seriesId) throw new Error('Hauptserien-ID konnte nicht ermittelt werden.');
        const episodes = await MediaApi.getEpisodes(seriesId, id);
        if (episodes && episodes.length > 0) {
          const unplayed = episodes.find(e => e.UserData && !e.UserData.Played);
          playableId = unplayed ? unplayed.Id : episodes[0].Id;
          item = await MediaApi.getItem(playableId);
        } else {
          throw new Error('Keine Episoden in dieser Staffel gefunden.');
        }
      }

      if (item.RunTimeTicks) {
        mediaDuration = item.RunTimeTicks / 10000000;
        timeDuration.textContent = formatTime(mediaDuration);
      }

      playbackLoader.resetFallback();
      await playbackLoader.loadPlaybackSource(playableId, settingsStore.getPlaybackMode(), {
        autoplay: true
      });
    } catch (err) {
      console.error('[Player Initialisation Error]', err);
      loader.classList.add('hidden');
      showError('Ladefehler', err.message || 'Der Medienstrom konnte nicht geladen werden.');
    }
  };

  // Initialize
  controlsApi.updateVolume(0.8);
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
