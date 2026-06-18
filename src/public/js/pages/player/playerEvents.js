export function createPlayerEvents({
  video,
  togglePlay,
  cleanupPlayer,
  updateFullscreenIcon,
  handleVideoError,
  resetControlTimeout,
  getDuration
}) {
  const isValidDuration = (duration) => Number.isFinite(duration) && duration > 0;

  const handleKeyDown = (e) => {
    resetControlTimeout?.();
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft': {
        e.preventDefault();
        const duration = getDuration?.();
        if (!isValidDuration(duration)) break;
        video.currentTime = Math.max(0, Math.min(duration, video.currentTime - 10));
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        const duration = getDuration?.();
        if (!isValidDuration(duration)) break;
        video.currentTime = Math.min(duration, Math.max(0, video.currentTime + 10));
        break;
      }
    }
  };

  const handleFullscreenChange = () => {
    updateFullscreenIcon();
  };

  const handleHashChange = () => {
    if (!window.location.hash.startsWith('#/player')) cleanupPlayer();
  };

  const handleVideoErrorEvent = () => {
    handleVideoError();
  };

  window.addEventListener('keydown', handleKeyDown);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  window.addEventListener('hashchange', handleHashChange);
  video.addEventListener('error', handleVideoErrorEvent);

  return {
    cleanup: () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('hashchange', handleHashChange);
      video.removeEventListener('error', handleVideoErrorEvent);
    }
  };
}
