import {
  isFullscreen, enterFullscreen, exitFullscreen, isInlineFullscreen, enterInlineFullscreen, exitInlineFullscreen
} from '../platform.js';
import { lockLandscape, unlockOrientation } from '../orientation.js';
import { svgIcon } from './markup.js';

export function bindFullscreenControls(context) {
  const { root, iosLike } = context;

  const shell = root.querySelector('.vanta-player-shell');
  const fullscreenButton = root.querySelector('.vanta-player-fullscreen-button');
  // A page can hand in a larger element (the watch party its whole page), so
  // its own overlays (notifications, the waiting pill) stay visible in
  // fullscreen; only the fullscreen element and its children are shown.
  const fullscreenElement = () => context.fullscreenTarget?.() || shell;

  const updateFullscreenIcon = () => {
    if (!fullscreenButton) return;
    const inFullscreen = iosLike ? isInlineFullscreen(root) : isFullscreen();
    fullscreenButton.setAttribute('aria-label', inFullscreen ? 'Vollbild beenden' : 'Vollbild');
    fullscreenButton.innerHTML = svgIcon(inFullscreen ? 'fullscreenExit' : 'fullscreenEnter');
  };

  // On a phone the big picture also turns the video sideways. Only browsers
  // with the Screen Orientation API can do that (Android); on an iPhone the
  // player fills the screen and the viewer turns the phone.
  context.toggleFullscreen = async () => {
    try {
      if (iosLike) {
        if (isInlineFullscreen(root)) exitInlineFullscreen(root);
        else enterInlineFullscreen(root);
        updateFullscreenIcon();
      } else if (isFullscreen()) {
        if (context.isPhone) await unlockOrientation().catch(() => {});
        await exitFullscreen();
      } else {
        await enterFullscreen(fullscreenElement());
        if (context.isPhone) await lockLandscape().catch(() => {});
      }
    } catch {
      // ignore fullscreen errors
    }
  };

  if (fullscreenButton) {
    const handleFullscreenClick = () => { context.toggleFullscreen(); };
    fullscreenButton.addEventListener('click', handleFullscreenClick);
    context.disposers.push(() => fullscreenButton.removeEventListener('click', handleFullscreenClick));
  }

  // Leaving fullscreen by the system (back gesture, Esc) frees the rotation too.
  const handleFullscreenChange = () => {
    updateFullscreenIcon();
    if (context.isPhone && !isFullscreen()) unlockOrientation().catch(() => {});
  };
  const fullscreenChangeEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
  fullscreenChangeEvents.forEach(event => {
    document.addEventListener(event, handleFullscreenChange);
    context.disposers.push(() => document.removeEventListener(event, handleFullscreenChange));
  });

  context.updateFullscreenIcon = updateFullscreenIcon;

  return context;
}
