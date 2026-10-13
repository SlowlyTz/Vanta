export const COVER_FADE_MS = 200;
// A start that shows nothing after this long says so instead of spinning on.
export const START_WATCHDOG_MS = 40_000;

// The loading cover and its status line ("› Erstes HLS-Segment wird …").
// Once the cover has faded out, the status goes back to its first line, so
// a finished start no longer reads as loading to anyone looking into the
// player (and a later cover never flashes the last start's step).
//
// When the start fails or takes far too long, the cover says why (also in
// the console) and offers "Erneut versuchen" and "Zurück" instead of
// spinning forever; a start that still succeeds clears it again.
export function createLoadingCover({ dom, getLoadIndicator = () => null, onRetry = () => window.location.reload(), onLeave = () => window.history.back(), watchdogMs = START_WATCHDOG_MS }) {
  const initialStatus = dom.loadingStatus.textContent;
  const initialLabel = dom.loadingLabel?.textContent || '';
  let resetTimer = null;
  let watchdog = null;

  const clearProblem = () => {
    if (!dom.loadingProblem || dom.loadingProblem.hidden) return;
    dom.loadingProblem.hidden = true;
    dom.loading.classList.remove('has-problem');
    if (dom.loadingLabel) dom.loadingLabel.textContent = initialLabel;
  };

  // `fatal` stops the spinner (the start failed); otherwise it keeps going.
  const showProblem = (message, { fatal = false } = {}) => {
    if (!dom.loadingProblem) return;
    console.error('[VANTA Player]', message);
    dom.loadingProblemText.textContent = message;
    dom.loadingProblem.hidden = false;
    dom.loading.classList.add('has-problem');
    dom.loading.classList.toggle('is-failed', fatal);
    if (dom.loadingLabel) dom.loadingLabel.textContent = fatal ? 'Wiedergabe konnte nicht starten' : 'Der Start dauert ungewöhnlich lange';
    dom.loadingRetry?.focus({ preventScroll: true });
  };

  dom.loadingRetry?.addEventListener('click', () => onRetry());
  dom.loadingLeave?.addEventListener('click', () => onLeave());

  const armWatchdog = () => {
    if (watchdog !== null || !watchdogMs) return;
    watchdog = window.setTimeout(() => {
      watchdog = null;
      if (!dom.loading.classList.contains('is-hidden')) {
        showProblem(`Seit ${Math.round(watchdogMs / 1000)} Sekunden kommt kein Bild. Letzter Schritt: ${dom.loadingStatus.textContent}`);
      }
    }, watchdogMs);
  };
  const disarmWatchdog = () => {
    if (watchdog !== null) window.clearTimeout(watchdog);
    watchdog = null;
  };

  const cancelReset = () => {
    if (resetTimer !== null) window.clearTimeout(resetTimer);
    resetTimer = null;
  };

  const setStatus = status => {
    if (status) dom.loadingStatus.textContent = status;
  };

  const setVisible = (visible, status) => {
    cancelReset();
    setStatus(status);
    dom.loading.classList.toggle('is-hidden', !visible);
    getLoadIndicator()?.setCoverVisible(visible);
    if (visible) armWatchdog();
    else {
      disarmWatchdog();
      clearProblem();
    }
    if (!visible) {
      resetTimer = window.setTimeout(() => {
        resetTimer = null;
        dom.loadingStatus.textContent = initialStatus;
      }, COVER_FADE_MS);
    }
  };

  armWatchdog();

  return {
    setVisible,
    setStatus,
    showProblem,
    dispose: () => {
      cancelReset();
      disarmWatchdog();
    }
  };
}
