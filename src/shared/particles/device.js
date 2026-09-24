// Phones and small machines get fewer particles and a lower pixel ratio;
// the scenes stay smooth instead of dropping frames.
export const isLowPower = () =>
  (window.matchMedia?.('(pointer: coarse)').matches) || (navigator.hardwareConcurrency || 8) <= 4;

export const pixelRatio = lowPower => Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
