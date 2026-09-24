import { formatEpisodeCode } from './episodes.js';

const DEFAULT_COUNTDOWN_MS = 10_000;
const VIEWER_MESSAGE = 'Startet automatisch. Abbrechen oder sofort starten können nur Admins.';

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function episodeImageUrl(episode) {
  const tag = episode?.ImageTags?.Primary;
  if (!episode?.Id || !tag) return null;
  return `/api/media/image/${episode.Id}?type=Primary&tag=${encodeURIComponent(tag)}&maxWidth=200`;
}

// `onConfirm(next, { auto })` fires on the button (auto: false) and when the
// countdown runs out (auto: true). Without `controls` (watch-party viewers)
// both buttons are hidden, but the countdown still runs, so everyone sees the
// same prompt; the embedder decides who actually switches.
export function createNextEpisodePrompt({ root, onConfirm, onDismiss, countdownMs = DEFAULT_COUNTDOWN_MS }) {
  let timeoutId = null;
  let animationFrameId = null;
  let startedAt = 0;
  let countdownFrom = 0;
  let countdownTo = 0;
  let readCurrentTime = null;
  let active = null;
  let controls = true;
  let lastInputWasKeyboard = false;
  let previouslyFocused = null;

  const element = document.createElement('div');
  element.className = 'vanta-player-next-episode';
  element.setAttribute('role', 'complementary');
  element.setAttribute('aria-label', 'Nächste Folge');
  element.hidden = true;

  const media = document.createElement('div');
  media.className = 'vanta-player-next-episode-media';
  media.hidden = true;

  const body = document.createElement('div');
  body.className = 'vanta-player-next-episode-body';

  const kicker = document.createElement('span');
  kicker.className = 'vanta-player-next-episode-kicker';

  const code = document.createElement('strong');
  code.className = 'vanta-player-next-episode-code';

  const titleEl = document.createElement('span');
  titleEl.className = 'vanta-player-next-episode-title';

  const seriesEl = document.createElement('span');
  seriesEl.className = 'vanta-player-next-episode-series';
  seriesEl.hidden = true;

  const countdown = document.createElement('span');
  countdown.className = 'vanta-player-next-episode-countdown';
  countdown.setAttribute('aria-live', 'off');
  countdown.hidden = true;

  const messageEl = document.createElement('p');
  messageEl.className = 'vanta-player-next-episode-message';
  messageEl.hidden = true;

  const actions = document.createElement('div');
  actions.className = 'vanta-player-next-episode-actions';

  const confirmButton = document.createElement('button');
  confirmButton.type = 'button';
  confirmButton.className = 'vanta-player-next-episode-confirm';

  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'vanta-player-next-episode-dismiss';
  dismissButton.textContent = 'Abbrechen';

  actions.append(dismissButton, confirmButton);
  body.append(kicker, code, titleEl, seriesEl, countdown, messageEl, actions);
  element.append(media, body);
  root.appendChild(element);

  function setProgress(progress) {
    confirmButton.style.setProperty('--next-episode-progress', String(Math.min(1, Math.max(0, progress))));
  }

  function setRemaining(seconds) {
    if (!Number.isFinite(seconds)) {
      countdown.hidden = true;
      countdown.textContent = '';
      return;
    }
    countdown.textContent = `Startet in ${Math.max(0, Math.ceil(seconds))} s`;
    countdown.hidden = false;
  }

  function tick(now) {
    const elapsed = now - startedAt;
    setProgress(elapsed / countdownMs);
    setRemaining((countdownMs - elapsed) / 1000);

    if (elapsed / countdownMs >= 1) {
      finish({ auto: true });
      return;
    }

    animationFrameId = window.requestAnimationFrame(tick);
  }

  // Countdown driven by media time rather than wall-clock time, so pausing the
  // video pauses the countdown and seeking backwards pushes the skip back out.
  function tickMediaTime() {
    const remaining = countdownTo - readCurrentTime();
    setProgress(1 - remaining / (countdownTo - countdownFrom));
    setRemaining(remaining);

    if (Number.isFinite(remaining) && remaining <= 0) {
      finish({ auto: true });
      return;
    }

    animationFrameId = window.requestAnimationFrame(tickMediaTime);
  }

  function clearTimers() {
    if (timeoutId) window.clearTimeout(timeoutId);
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    timeoutId = null;
    animationFrameId = null;
  }

  function finish({ auto }) {
    if (!active) return;
    const next = active;
    hide();
    onConfirm?.(next, { auto });
  }

  function confirm() {
    if (controls) finish({ auto: false });
  }

  function applyControls(message = null) {
    confirmButton.hidden = !controls;
    dismissButton.hidden = !controls;
    messageEl.textContent = controls ? '' : (message || VIEWER_MESSAGE);
    messageEl.hidden = controls;
  }

  function hide() {
    clearTimers();
    active = null;
    readCurrentTime = null;
    element.hidden = true;
    setProgress(0);
    setRemaining(NaN);

    const focusIsInside = document.activeElement && element.contains(document.activeElement);
    if (focusIsInside && previouslyFocused?.isConnected) {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  }

  function startCountdown(skipAt, getCurrentTime) {
    const currentTime = typeof getCurrentTime === 'function' ? getCurrentTime() : NaN;

    if (Number.isFinite(skipAt) && Number.isFinite(currentTime)) {
      // Already past the auto-advance point (e.g. the viewer seeked into the last
      // seconds): show the overlay, but never skip without a visible countdown.
      if (skipAt <= currentTime) {
        setRemaining(NaN);
        return;
      }
      countdownFrom = currentTime;
      countdownTo = skipAt;
      readCurrentTime = getCurrentTime;
      setRemaining(skipAt - currentTime);
      animationFrameId = window.requestAnimationFrame(tickMediaTime);
      return;
    }

    startedAt = performance.now();
    setRemaining(countdownMs / 1000);
    animationFrameId = window.requestAnimationFrame(tick);
  }

  function show(next, options = {}) {
    const {
      controls: withControls = true,
      message: infoMessage = null,
      skipAt = null,
      getCurrentTime = null
    } = options;
    clearTimers();
    active = next;
    controls = withControls;
    previouslyFocused = document.activeElement;
    element.hidden = false;

    const isNextSeason = next.kind === 'next-season';
    kicker.textContent = isNextSeason ? 'Nächste Staffel' : 'Nächste Folge';
    code.textContent = formatEpisodeCode(next.episode);
    titleEl.textContent = next.episode?.Name || 'Unbenannte Folge';

    if (next.episode?.SeriesName) {
      seriesEl.textContent = next.episode.SeriesName;
      seriesEl.hidden = false;
    } else {
      seriesEl.hidden = true;
    }

    const imageUrl = episodeImageUrl(next.episode);
    if (imageUrl) {
      media.style.backgroundImage = `url("${imageUrl.replaceAll('"', '%22')}")`;
      media.hidden = false;
    } else {
      media.style.backgroundImage = '';
      media.hidden = true;
    }

    confirmButton.textContent = isNextSeason ? 'Nächste Staffel starten' : 'Nächste Folge starten';

    applyControls(infoMessage);
    setProgress(0);
    startCountdown(skipAt, getCurrentTime);

    if (lastInputWasKeyboard && controls) confirmButton.focus();
  }

  dismissButton.addEventListener('click', () => {
    const dismissed = active;
    hide();
    onDismiss?.(dismissed);
  });
  confirmButton.addEventListener('click', confirm);

  const trackInputModality = event => {
    lastInputWasKeyboard = event.type === 'keydown';
  };
  document.addEventListener('keydown', trackInputModality, true);
  document.addEventListener('pointerdown', trackInputModality, true);
  document.addEventListener('mousedown', trackInputModality, true);

  const handleDocumentKeydown = event => {
    if (event.key !== 'Escape' || element.hidden) return;
    event.stopPropagation();
    const dismissed = active;
    hide();
    onDismiss?.(dismissed);
  };
  document.addEventListener('keydown', handleDocumentKeydown);

  return {
    element,
    confirmButton,
    dismissButton,
    show,
    hide,
    // Admin rights can change while the prompt is open.
    setControls(value, message) {
      controls = Boolean(value);
      if (active) applyControls(message);
    },
    isVisible: () => !element.hidden,
    destroy: () => {
      hide();
      document.removeEventListener('keydown', trackInputModality, true);
      document.removeEventListener('pointerdown', trackInputModality, true);
      document.removeEventListener('mousedown', trackInputModality, true);
      document.removeEventListener('keydown', handleDocumentKeydown);
      element.remove();
    }
  };
}
