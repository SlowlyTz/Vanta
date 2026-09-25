// Swipe down to close a bottom sheet, like on a phone. The sheet follows the
// finger while its content is scrolled to the top; far or fast enough and it
// slides out and closes, otherwise it springs back. Only active where the
// dialog is shown as a sheet (the phone layout).
const SHEET_QUERY = '(max-width: 600px)';
const DISMISS_FRACTION = 0.25;
const DISMISS_MAX_PX = 140;
const FLICK_PX_PER_MS = 0.6;
const SETTLE_MS = 240;

export function bindSheetSwipe({
  sheet,
  getScrollElement = () => sheet,
  backdrop = null,
  onDismiss,
  isEnabled = () => window.matchMedia?.(SHEET_QUERY).matches === true
}) {
  let startY = 0;
  let startTime = 0;
  let offset = 0;
  let tracking = false;
  let dragging = false;

  const setOffset = (value, { animate = false } = {}) => {
    offset = value;
    sheet.style.transition = animate ? `transform ${SETTLE_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1)` : 'none';
    sheet.style.transform = value ? `translate3d(0, ${value}px, 0)` : '';
    if (backdrop) {
      backdrop.style.transition = animate ? `opacity ${SETTLE_MS}ms ease` : 'none';
      backdrop.style.opacity = value ? String(Math.max(0.2, 1 - value / (sheet.offsetHeight || 1))) : '';
    }
  };

  const clearStyles = () => {
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (backdrop) {
      backdrop.style.transition = '';
      backdrop.style.opacity = '';
    }
  };

  const onTouchStart = event => {
    if (event.touches.length !== 1 || !isEnabled()) return;
    const scroller = getScrollElement();
    // Scrolled content scrolls first; the sheet only moves from the top.
    if (scroller && scroller.scrollTop > 0) return;
    tracking = true;
    dragging = false;
    startY = event.touches[0].clientY;
    startTime = event.timeStamp ?? Date.now();
  };

  const onTouchMove = event => {
    if (!tracking) return;
    const delta = event.touches[0].clientY - startY;
    if (!dragging) {
      if (delta <= 4) {
        // Upwards (or not yet moved): the content scrolls as usual.
        if (delta < 0) tracking = false;
        return;
      }
      dragging = true;
    }
    event.preventDefault();
    setOffset(Math.max(0, delta));
  };

  const onTouchEnd = event => {
    if (!tracking) return;
    tracking = false;
    if (!dragging) return;
    dragging = false;

    const elapsed = Math.max(1, (event.timeStamp ?? Date.now()) - startTime);
    const height = sheet.offsetHeight || window.innerHeight;
    const flicked = offset / elapsed > FLICK_PX_PER_MS;
    if (offset > Math.min(DISMISS_MAX_PX, height * DISMISS_FRACTION) || flicked) {
      setOffset(height, { animate: true });
      window.setTimeout(() => {
        onDismiss?.();
        // The closed sheet starts from its normal place next time.
        window.setTimeout(clearStyles, 320);
      }, SETTLE_MS);
    } else {
      setOffset(0, { animate: true });
      window.setTimeout(clearStyles, SETTLE_MS);
    }
  };

  sheet.addEventListener('touchstart', onTouchStart, { passive: true });
  sheet.addEventListener('touchmove', onTouchMove, { passive: false });
  sheet.addEventListener('touchend', onTouchEnd);
  sheet.addEventListener('touchcancel', onTouchEnd);

  return () => {
    sheet.removeEventListener('touchstart', onTouchStart);
    sheet.removeEventListener('touchmove', onTouchMove);
    sheet.removeEventListener('touchend', onTouchEnd);
    sheet.removeEventListener('touchcancel', onTouchEnd);
    clearStyles();
  };
}
