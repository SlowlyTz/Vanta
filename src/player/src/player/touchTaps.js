// Touch gestures on the picture, like the common streaming apps: a double
// tap on the left or right third seeks ten seconds, every further tap while
// the streak runs seeks again, and a single tap shows or hides the controls.

export const DOUBLE_TAP_MS = 300;
export const SEEK_STREAK_MS = 650;
export const MAX_TAP_DISTANCE_PX = 40;

export function tapSide(x, width) {
  if (x < width / 3) return 'back';
  if (x > (width * 2) / 3) return 'forward';
  return null;
}

// Decides what a tap means. `onSingle` fires only once no second tap came.
export function createTapRecognizer({
  onSingle,
  onSeek,
  now = () => performance.now(),
  setTimer = (fn, ms) => window.setTimeout(fn, ms),
  clearTimer = id => window.clearTimeout(id)
}) {
  let last = null;
  let streak = null;
  let singleTimer = null;

  return {
    tap({ x, y, width }) {
      const at = now();
      const side = tapSide(x, width);

      if (streak && side === streak.side && at - streak.at <= SEEK_STREAK_MS) {
        streak.at = at;
        onSeek(side);
        return 'seek';
      }
      streak = null;

      const isDouble = last && at - last.at <= DOUBLE_TAP_MS && Math.hypot(x - last.x, y - last.y) <= MAX_TAP_DISTANCE_PX;
      if (isDouble && side) {
        clearTimer(singleTimer);
        singleTimer = null;
        last = null;
        streak = { side, at };
        onSeek(side);
        return 'seek';
      }

      last = { x, y, at };
      clearTimer(singleTimer);
      singleTimer = setTimer(() => {
        singleTimer = null;
        last = null;
        onSingle();
      }, DOUBLE_TAP_MS);
      return 'pending';
    },
    destroy() {
      clearTimer(singleTimer);
    }
  };
}

export function bindTouchTaps(context) {
  const { root, listen, ui } = context;
  const layer = root.querySelector('.vanta-player-tap-layer');
  if (!layer) return context;

  const recognizer = createTapRecognizer({
    onSeek: side => context.seekStep(side === 'back' ? -10 : 10),
    onSingle: () => {
      if (ui.getState() === 'ready-playing-active') ui.setState('ready-playing-idle');
      else ui.resetIdle();
    }
  });

  listen(layer, 'pointerup', event => {
    if (event.pointerType === 'mouse') return;
    const rect = layer.getBoundingClientRect();
    recognizer.tap({ x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width });
  });
  context.disposers.push(() => recognizer.destroy());
  return context;
}
