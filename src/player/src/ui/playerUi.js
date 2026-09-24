const IDLE_TIMEOUT_MS = 3_500;

const VALID_STATES = new Set([
  'booting',
  'ready-paused',
  'ready-playing-active',
  'ready-playing-idle',
  'seeking',
  'buffering',
  'switching-source'
]);

export function createPlayerUi(root, options = {}) {
  const { idleTimeoutMs = IDLE_TIMEOUT_MS } = options;
  let state = 'booting';
  let idleTimer = null;
  let destroyed = false;
  // Reasons that keep the controls up (pointer over them, settings open).
  const holds = new Set();

  const apply = () => {
    if (destroyed) return;
    root.setAttribute('data-ui-state', state);
  };

  const clearIdleTimer = () => {
    if (!idleTimer) return;
    window.clearTimeout(idleTimer);
    idleTimer = null;
  };

  const startIdleTimer = () => {
    clearIdleTimer();
    if (state !== 'ready-playing-active' || destroyed || holds.size > 0) return;
    idleTimer = window.setTimeout(() => {
      idleTimer = null;
      setState('ready-playing-idle');
    }, idleTimeoutMs);
  };

  const setState = next => {
    if (destroyed) return;
    if (!VALID_STATES.has(next)) return;
    state = next;
    apply();
    if (state === 'ready-playing-active') startIdleTimer();
    else clearIdleTimer();
  };

  const resetIdle = () => {
    if (destroyed) return;
    if (state === 'ready-playing-idle') {
      setState('ready-playing-active');
    } else if (state === 'ready-playing-active') {
      startIdleTimer();
    }
  };

  const events = ['pointermove', 'pointerdown', 'pointerup', 'keydown', 'focusin'];
  const handler = resetIdle;
  events.forEach(name => root.addEventListener(name, handler, { passive: true }));

  apply();

  const holdActive = reason => {
    if (destroyed) return;
    holds.add(reason);
    if (state === 'ready-playing-idle') setState('ready-playing-active');
    else clearIdleTimer();
  };

  const releaseActive = reason => {
    if (!holds.delete(reason) || destroyed) return;
    if (state === 'ready-playing-active') startIdleTimer();
  };

  return {
    setState,
    getState: () => state,
    resetIdle,
    holdActive,
    releaseActive,
    isHeld: () => holds.size > 0,
    destroy: () => {
      destroyed = true;
      holds.clear();
      clearIdleTimer();
      events.forEach(name => root.removeEventListener(name, handler));
    }
  };
}
