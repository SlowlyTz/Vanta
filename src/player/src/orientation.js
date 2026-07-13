import { isIOSLike } from './platform.js';

export function isSmartphone() {
  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const hasTouch = navigator.maxTouchPoints > 0;
  const smallScreen = Math.min(window.screen?.width || 0, window.screen?.height || 0) < 768;
  return isMobile && !isTablet && hasTouch && smallScreen;
}

export function isLandscape() {
  const rawAngle = screen.orientation?.angle ?? window.orientation;
  const angle = Number(rawAngle);
  if (Number.isFinite(angle) && Math.abs(angle) > 0) {
    return Math.abs(angle) === 90;
  }
  return window.innerWidth > window.innerHeight;
}

export async function requestFullscreen(element) {
  if (document.fullscreenElement || document.webkitFullscreenElement) return;

  if (element.requestFullscreen) {
    await element.requestFullscreen();
    return;
  }

  if (element.webkitRequestFullscreen) {
    await element.webkitRequestFullscreen();
    return;
  }

  const video = element.querySelector('video');
  if (!isIOSLike() && video?.webkitEnterFullscreen) {
    video.webkitEnterFullscreen();
    return;
  }

  throw new Error('Fullscreen not supported');
}

export async function exitFullscreen() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) return;

  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }

  if (document.webkitExitFullscreen) {
    await document.webkitExitFullscreen();
    return;
  }
}

export async function lockLandscape() {
  if (screen.orientation?.lock) {
    await screen.orientation.lock('landscape');
    return true;
  }
  return false;
}

export async function unlockOrientation() {
  if (screen.orientation?.unlock) {
    await screen.orientation.unlock();
    return true;
  }
  return false;
}

export function createOrientationGate({ root, onEnter }) {
  let gate = null;
  let button = null;

  const create = () => {
    if (gate) return;
    gate = document.createElement('div');
    gate.className = 'vanta-player-orientation-gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-label', 'Querformat erforderlich');
    gate.innerHTML = `
      <div class="vanta-player-orientation-gate-inner">
        <div class="vanta-player-orientation-icon" aria-hidden="true">⟳</div>
        <strong>Querformat erforderlich</strong>
        <p>Drehe dein Gerät oder tippe hier, um im Player fortzufahren.</p>
        <button type="button" class="vanta-player-orientation-button">Player fortsetzen</button>
      </div>`;

    button = gate.querySelector('.vanta-player-orientation-button');
    button.addEventListener('click', onEnter);
    root.querySelector('.vanta-player-shell')?.appendChild(gate);
  };

  const show = () => {
    create();
    if (gate) gate.hidden = false;
  };

  const hide = () => {
    if (gate) gate.hidden = true;
  };

  const isVisible = () => Boolean(gate) && !gate.hidden;

  const destroy = () => {
    button?.removeEventListener('click', onEnter);
    gate?.remove();
    gate = null;
    button = null;
  };

  return { show, hide, isVisible, destroy };
}

export async function enterSmartphoneFullscreen({ root, onError }) {
  if (!isIOSLike()) {
    try {
      await requestFullscreen(root);
    } catch (fullscreenError) {
      onError?.(fullscreenError);
    }
  }

  try {
    await lockLandscape();
  } catch {
    // iOS and some browsers do not support orientation lock; this is not fatal.
  }
}

export async function exitSmartphoneFullscreen() {
  await unlockOrientation();
  await exitFullscreen();
}
