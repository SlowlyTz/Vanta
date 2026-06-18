import { MediaApi } from '../../api/media.api.js';

export function createPlaybackLoader({
  video,
  loader,
  errorOverlay,
  getDuration,
  showError,
  showControls
}) {
  let playbackLoadVersion = 0;
  let hls = null;

  const destroyHls = () => {
    if (!hls) return;
    hls.destroy();
    hls = null;
  };

  const playIfNeeded = (autoplay) => {
    if (!autoplay) return;
    video.play().catch(err => {
      if (err.name === 'NotAllowedError') {
        console.warn('Autoplay blocked by browser. Waiting for user interaction.');
        showControls?.();
      } else {
        console.error('Video play error:', err);
      }
    });
  };

  const loadHlsSource = (url, { autoplay, loadVersion }) => {
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.load();
      playIfNeeded(autoplay);
      return;
    }

    if (!window.Hls?.isSupported()) {
      loader.classList.add('hidden');
      showError(
        'Wiedergabefehler',
        'Dieser Browser kann den von Jellyfin gelieferten HLS-Stream nicht abspielen.'
      );
      return;
    }

    hls = new window.Hls({ enableWorker: false });

    hls.on(window.Hls.Events.ERROR, (_event, data) => {
      if (!data?.fatal) return;

      if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
        return;
      }

      if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
        return;
      }

      loader.classList.add('hidden');
      destroyHls();
      showError('Wiedergabefehler', 'Der Jellyfin-HLS-Stream konnte nicht abgespielt werden.');
    });

    hls.on(window.Hls.Events.MEDIA_ATTACHED, () => {
      if (loadVersion !== playbackLoadVersion) return;
      hls.loadSource(url);
    });

    hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
      if (loadVersion !== playbackLoadVersion) return;
      playIfNeeded(autoplay);
    });

    hls.attachMedia(video);
  };

  const loadPlaybackSource = async (id, options = {}) => {
    const { autoplay = true, preserveTime = false } = options;
    const loadVersion = ++playbackLoadVersion;
    const resumeTime = preserveTime && Number.isFinite(video.currentTime) ? video.currentTime : 0;

    loader.classList.remove('hidden');
    errorOverlay.classList.add('hidden');

    const playback = await MediaApi.getPlayback(id);
    if (loadVersion !== playbackLoadVersion) return;

    destroyHls();
    video.removeAttribute('src');

    if (resumeTime > 0) {
      video.addEventListener('loadedmetadata', () => {
        const duration = getDuration();
        if (duration && resumeTime < duration) {
          video.currentTime = resumeTime;
        }
      }, { once: true });
    }

    if (playback.delivery === 'hls') {
      loadHlsSource(playback.url, { autoplay, loadVersion });
      return;
    }

    video.src = playback.url;
    video.load();
    playIfNeeded(autoplay);
  };

  const handleVideoError = async () => {
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
  };

  return {
    loadPlaybackSource,
    handleVideoError,
    cleanup: destroyHls
  };
}
