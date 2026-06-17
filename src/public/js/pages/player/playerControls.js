import { formatTime } from '../../utils/format.js';
import { playIcon, pauseIcon, volumeHighIcon, volumeMutedIcon, fullscreenEnterIcon, fullscreenExitIcon } from './playerIcons.js';

export function createPlayerControls({
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
}) {
  let controlTimeout = null;
  let isMuted = false;
  let savedVolume = 0.8;
  let isDragging = false;

  const showControls = () => {
    controls.classList.remove('hidden-controls');
    topbar.classList.remove('hidden-controls');
    document.body.style.cursor = 'default';
  };

  const hideControls = () => {
    controls.classList.add('hidden-controls');
    topbar.classList.add('hidden-controls');
    document.body.style.cursor = 'none';
  };

  const resetControlTimeout = (autoHide = true) => {
    showControls();
    if (controlTimeout) clearTimeout(controlTimeout);
    if (!autoHide) return;
    controlTimeout = setTimeout(() => {
      if (!video.paused) hideControls();
    }, 3500);
  };

  const togglePlay = () => {
    if (video.paused) {
      video.play().catch(err => console.error('Video play error:', err));
    } else {
      video.pause();
    }
  };

  const updatePlayPauseIcon = () => {
    playPauseBtn.innerHTML = video.paused ? playIcon : pauseIcon;
  };

  const seek = (e) => {
    const rect = timeline.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const duration = getDuration();
    if (duration) video.currentTime = pos * duration;
  };

  const updateTimeline = () => {
    const duration = getDuration();
    if (!duration) return;
    const current = video.currentTime;
    timeElapsed.textContent = formatTime(current);
    timeDuration.textContent = formatTime(duration);
    const percent = (current / duration) * 100;
    progressFill.style.width = `${percent}%`;
    progressHandle.style.left = `${percent}%`;
  };

  const updateBuffer = () => {
    const duration = getDuration();
    if (duration && video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      bufferFill.style.width = `${(bufferedEnd / duration) * 100}%`;
    }
  };

  const updateVolume = (val) => {
    video.volume = val;
    volumeSlider.value = val;
    isMuted = val === 0;
    volumeBtn.innerHTML = isMuted ? volumeMutedIcon : volumeHighIcon;
  };

  const toggleVolume = () => {
    if (isMuted) updateVolume(savedVolume);
    else {
      savedVolume = video.volume > 0 ? video.volume : 0.8;
      updateVolume(0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => console.error('Fullscreen failed:', err));
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const updateFullscreenIcon = () => {
    fullscreenBtn.innerHTML = document.fullscreenElement ? fullscreenExitIcon : fullscreenEnterIcon;
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
    updatePlayPauseIcon();
    resetControlTimeout();
  });

  video.addEventListener('pause', () => {
    updatePlayPauseIcon();
    controls.classList.remove('hidden-controls');
    document.body.style.cursor = 'default';
    if (controlTimeout) clearTimeout(controlTimeout);
  });

  video.addEventListener('timeupdate', updateTimeline);
  video.addEventListener('progress', updateBuffer);
  video.addEventListener('loadedmetadata', () => {
    if (!getDuration() && video.duration) {
      timeDuration.textContent = formatTime(video.duration);
    }
  });

  timeline.addEventListener('click', (e) => {
    e.stopPropagation();
    seek(e);
  });

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

  volumeSlider.addEventListener('input', (e) => {
    e.stopPropagation();
    updateVolume(parseFloat(e.target.value));
  });

  volumeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleVolume();
  });

  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen();
  });

  container.addEventListener('mousemove', () => resetControlTimeout());
  container.addEventListener('click', () => resetControlTimeout());

  video.addEventListener('waiting', () => loader.classList.remove('hidden'));
  video.addEventListener('playing', () => loader.classList.add('hidden'));
  video.addEventListener('seeking', () => loader.classList.remove('hidden'));
  video.addEventListener('seeked', () => loader.classList.add('hidden'));

  return {
    togglePlay,
    updateVolume,
    toggleFullscreen,
    showControls,
    hideControls,
    resetControlTimeout,
    updateFullscreenIcon,
    cleanup: () => {
      if (controlTimeout) clearTimeout(controlTimeout);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    }
  };
}
