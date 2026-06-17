export function createPlayerEvents({
  video,
  streamMenuWrapper,
  togglePlay,
  setStreamMenuOpen,
  cleanupPlayer,
  updateFullscreenIcon,
  handleVideoError,
  playableId,
  getPlayableId,
  resetControlTimeout
}) {
  const handleKeyDown = (e) => {
    resetControlTimeout?.();
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        break;
      case 'ArrowRight': {
        e.preventDefault();
        const duration = video.duration;
        video.currentTime = Math.min(duration, video.currentTime + 10);
        break;
      }
    }
  };

  const handleDocumentPointerDown = (event) => {
    if (!streamMenuWrapper.contains(event.target)) setStreamMenuOpen(false);
  };

  const handleFullscreenChange = () => {
    updateFullscreenIcon();
  };

  const handleHashChange = () => {
    if (!window.location.hash.startsWith('#/player')) cleanupPlayer();
  };

  const handleVideoErrorEvent = () => {
    if (playableId || getPlayableId) {
      handleVideoError(getPlayableId?.() || playableId);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  document.addEventListener('pointerdown', handleDocumentPointerDown);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  window.addEventListener('hashchange', handleHashChange);
  video.addEventListener('error', handleVideoErrorEvent);

  return {
    cleanup: () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('hashchange', handleHashChange);
      video.removeEventListener('error', handleVideoErrorEvent);
    }
  };
}
