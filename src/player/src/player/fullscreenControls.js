import {
  isFullscreen, enterFullscreen, exitFullscreen, isInlineFullscreen, enterInlineFullscreen, exitInlineFullscreen
} from '../platform.js';
import { svgIcon } from './markup.js';

export function bindFullscreenControls(context) {
  const { root, iosLike, listen } = context;

  const shell = root.querySelector('.vanta-player-shell');
  const fullscreenButton = root.querySelector('.vanta-player-fullscreen-button');

  const updateFullscreenIcon = () => {
    if (!fullscreenButton) return;
    const inFullscreen = iosLike ? isInlineFullscreen(root) : isFullscreen();
    fullscreenButton.setAttribute('aria-label', inFullscreen ? 'Vollbild beenden' : 'Vollbild');
    fullscreenButton.innerHTML = svgIcon(inFullscreen ? 'fullscreenExit' : 'fullscreenEnter');
  };

  if (fullscreenButton) {
    const handleFullscreenClick = async () => {
      try {
        if (iosLike) {
          if (isInlineFullscreen(root)) exitInlineFullscreen(root);
          else enterInlineFullscreen(root);
          updateFullscreenIcon();
        } else if (isFullscreen()) {
          await exitFullscreen();
        } else {
          await enterFullscreen(shell);
        }
      } catch {
        // ignore fullscreen errors
      }
    };
    fullscreenButton.addEventListener('click', handleFullscreenClick);
    context.disposers.push(() => fullscreenButton.removeEventListener('click', handleFullscreenClick));
  }

  const fullscreenChangeEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
  fullscreenChangeEvents.forEach(event => {
    document.addEventListener(event, updateFullscreenIcon);
    context.disposers.push(() => document.removeEventListener(event, updateFullscreenIcon));
  });

  context.shell = shell;
  context.fullscreenButton = fullscreenButton;
  context.updateFullscreenIcon = updateFullscreenIcon;

  return context;
}
