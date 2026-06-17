import { MediaApi } from '../../api/media.api.js';
import { PLAYBACK_MODES, settingsStore } from '../../store/settings.store.js';

export function createPlaybackLoader({
  video,
  loader,
  errorOverlay,
  getDuration,
  onModeChange,
  showError,
  showControls
}) {
  let playbackLoadVersion = 0;
  let fallbackAttempted = false;
  let activePlaybackMode = settingsStore.getPlaybackMode();

  const loadPlaybackSource = async (id, mode = settingsStore.getPlaybackMode(), options = {}) => {
    const { autoplay = true, preserveTime = false } = options;
    const loadVersion = ++playbackLoadVersion;
    const resumeTime = preserveTime && Number.isFinite(video.currentTime) ? video.currentTime : 0;

    activePlaybackMode = mode;
    onModeChange?.(mode);
    loader.classList.remove('hidden');
    errorOverlay.classList.add('hidden');

    const playback = await MediaApi.getPlayback(id, mode);
    if (loadVersion !== playbackLoadVersion) return;

    video.src = playback.url;

    if (resumeTime > 0) {
      video.addEventListener('loadedmetadata', () => {
        const duration = getDuration();
        if (duration && resumeTime < duration) {
          video.currentTime = resumeTime;
        }
      }, { once: true });
    }

    video.load();

    if (autoplay) {
      video.play().catch(err => {
        if (err.name === 'NotAllowedError') {
          console.warn('Autoplay blocked by browser. Waiting for user interaction.');
          showControls?.();
        } else {
          console.error('Video play error:', err);
        }
      });
    }
  };

  const tryFallback = async (id) => {
    if (fallbackAttempted) return false;
    fallbackAttempted = true;
    try {
      await loadPlaybackSource(id, PLAYBACK_MODES.TRANSCODE, {
        autoplay: true,
        preserveTime: true
      });
      return true;
    } catch (fallbackError) {
      console.error('[Player Fallback Error]', fallbackError);
      return false;
    }
  };

  const handleVideoError = async (id) => {
    loader.classList.add('hidden');
    if (id && activePlaybackMode !== PLAYBACK_MODES.TRANSCODE && !fallbackAttempted) {
      const fallbackWorked = await tryFallback(id);
      if (fallbackWorked) return;
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
  };

  const resetFallback = () => {
    fallbackAttempted = false;
  };

  return {
    loadPlaybackSource,
    handleVideoError,
    resetFallback,
    getActiveMode: () => activePlaybackMode
  };
}
