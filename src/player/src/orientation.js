export function isSmartphone() {
  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const hasTouch = navigator.maxTouchPoints > 0;
  const smallScreen = Math.min(window.screen?.width || 0, window.screen?.height || 0) < 768;
  return isMobile && !isTablet && hasTouch && smallScreen;
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

export async function exitSmartphoneFullscreen() {
  await unlockOrientation();
  await exitFullscreen();
}
