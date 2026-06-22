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

export function isPictureInPictureSupported() {
  return document.pictureInPictureEnabled === true ||
    Boolean(document.createElement('video').webkitSupportsPresentationMode);
}

export async function exitPictureInPicture() {
  if (document.pictureInPictureElement && document.exitPictureInPicture) {
    await document.exitPictureInPicture();
  }

  const video = document.querySelector('video');
  if (video?.webkitPresentationMode === 'picture-in-picture' && video.webkitSetPresentationMode) {
    video.webkitSetPresentationMode('inline');
  }
}

export function isFullscreen() {
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

export async function enterFullscreen(element) {
  const target = element || document.documentElement;
  if (target.requestFullscreen) {
    await target.requestFullscreen();
  } else if (target.webkitRequestFullscreen) {
    await target.webkitRequestFullscreen();
  } else if (target.msRequestFullscreen) {
    await target.msRequestFullscreen();
  } else {
    throw new Error('Fullscreen not supported');
  }
}

export async function exitFullscreen() {
  if (document.exitFullscreen) {
    await document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    await document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    await document.msExitFullscreen();
  }
}
