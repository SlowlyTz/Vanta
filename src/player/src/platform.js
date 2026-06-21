export function isIOSLike() {
  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  return /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function supportsFinePointer() {
  return window.matchMedia?.('(pointer: fine)').matches ?? false;
}

export function canRequestFullscreen() {
  const doc = document;
  return Boolean(
    doc.fullscreenEnabled ||
    doc.webkitFullscreenEnabled ||
    document.documentElement.requestFullscreen ||
    document.documentElement.webkitRequestFullscreen
  );
}
