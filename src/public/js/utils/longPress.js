export const LONG_PRESS_MS = 500;
export const LONG_PRESS_MOVE_PX = 10;

// Long press (touch) and right click (mouse) on anything matching `selector`
// inside `root`, plus the context menu key or Shift+F10 on a focused one.
// A long press that opened the menu swallows the click that follows, so the
// card does not also navigate; moving the finger (scrolling) cancels it.
export function bindContextAction(root, selector, onOpen, { delay = LONG_PRESS_MS, tolerance = LONG_PRESS_MOVE_PX } = {}) {
  let timer = null;
  let start = null;
  let suppressClickUntil = 0;
  let lastTouchOpenAt = 0;

  const cancel = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    start = null;
  };

  const onPointerDown = event => {
    if (event.pointerType !== 'touch') return;
    const target = event.target.closest?.(selector);
    if (!target || !root.contains(target)) return;
    cancel();
    start = { x: event.clientX, y: event.clientY, target };
    timer = window.setTimeout(() => {
      const { target: pressed, x, y } = start;
      cancel();
      suppressClickUntil = Date.now() + 800;
      lastTouchOpenAt = Date.now();
      onOpen(pressed, { x, y, source: 'touch' });
    }, delay);
  };

  const onPointerMove = event => {
    if (!start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > tolerance) cancel();
  };

  const onClick = event => {
    if (Date.now() > suppressClickUntil) return;
    suppressClickUntil = 0;
    event.preventDefault();
    event.stopPropagation();
  };

  const onContextMenu = event => {
    const target = event.target.closest?.(selector);
    if (!target || !root.contains(target)) return;
    event.preventDefault();
    // Android follows a long press with a contextmenu event of its own.
    if (Date.now() - lastTouchOpenAt < 1000 || timer !== null) return;
    onOpen(target, { x: event.clientX, y: event.clientY, source: 'mouse' });
  };

  const onKeyDown = event => {
    if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return;
    const target = document.activeElement?.closest?.(selector);
    if (!target || !root.contains(target)) return;
    event.preventDefault();
    const rect = target.getBoundingClientRect();
    onOpen(target, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, source: 'keyboard' });
  };

  root.addEventListener('pointerdown', onPointerDown, { passive: true });
  root.addEventListener('pointermove', onPointerMove, { passive: true });
  root.addEventListener('pointerup', cancel);
  root.addEventListener('pointercancel', cancel);
  root.addEventListener('scroll', cancel, { capture: true, passive: true });
  root.addEventListener('click', onClick, true);
  root.addEventListener('contextmenu', onContextMenu);
  root.addEventListener('keydown', onKeyDown);

  return () => {
    cancel();
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('pointermove', onPointerMove);
    root.removeEventListener('pointerup', cancel);
    root.removeEventListener('pointercancel', cancel);
    root.removeEventListener('scroll', cancel, { capture: true });
    root.removeEventListener('click', onClick, true);
    root.removeEventListener('contextmenu', onContextMenu);
    root.removeEventListener('keydown', onKeyDown);
  };
}
