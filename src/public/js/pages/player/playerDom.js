import { createElement } from '../../utils/dom.js';
import {
  playIcon,
  pauseIcon,
  volumeHighIcon,
  fullscreenEnterIcon,
  backIcon
} from './playerIcons.js';

export function createPlayerDom() {
  const container = createElement('div', { className: 'player-page' });

  const video = createElement('video', {
    className: 'player-video',
    preload: 'auto',
    playsinline: true
  });
  video.volume = 0.8;

  const playPauseBtn = createElement('button', { className: 'player-btn' });
  const timeElapsed = createElement('span', {}, '00:00');
  const timeDuration = createElement('span', {}, '00:00');
  const progressFill = createElement('div', { className: 'player-progress-fill' });
  const bufferFill = createElement('div', { className: 'player-buffer-fill' });
  const progressHandle = createElement('div', { className: 'player-progress-handle' });
  const volumeBtn = createElement('button', { className: 'player-btn' });
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
  const topbar = createElement('div', { className: 'player-topbar' }, backBtn);
  const stage = createElement('div', { className: 'player-stage' }, video);

  playPauseBtn.innerHTML = playIcon;
  volumeBtn.innerHTML = volumeHighIcon;
  fullscreenBtn.innerHTML = fullscreenEnterIcon;
  backBtn.innerHTML = `${backIcon}Zurück`;

  return {
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
    loader,
    errorOverlay,
    timeline,
    controls,
    topbar,
    stage
  };
}
