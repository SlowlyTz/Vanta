import { formatEpisodeCode } from './episodes.js';

const DEFAULT_COUNTDOWN_MS = 10_000;
const VIEWER_MESSAGE = 'Die nächste Folge kann von einem WatchTogether-Admin gestartet werden.';

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

export function createNextEpisodePrompt({ root, onConfirm, onDismiss, countdownMs = DEFAULT_COUNTDOWN_MS }) {
  let timeoutId = null;
  let animationFrameId = null;
  let startedAt = 0;
  let active = null;
  let interactive = true;
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

  const message = document.createElement('p');
  message.className = 'vanta-player-next-episode-message';
  message.hidden = true;

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
  body.append(kicker, code, titleEl, seriesEl, message, actions);
  element.append(media, body);
  root.appendChild(element);

  function setProgress(progress) {
    confirmButton.style.setProperty('--next-episode-progress', String(Math.min(1, Math.max(0, progress))));
  }

  function tick(now) {
    const progress = (now - startedAt) / countdownMs;
    setProgress(progress);

    if (progress >= 1) {
      confirm();
      return;
    }

    animationFrameId = window.requestAnimationFrame(tick);
  }

  function clearTimers() {
    if (timeoutId) window.clearTimeout(timeoutId);
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    timeoutId = null;
    animationFrameId = null;
  }

  function confirm() {
    if (!active || !interactive) return;
    const next = active;
    hide();
    onConfirm?.(next);
  }

  function hide() {
    clearTimers();
    active = null;
    element.hidden = true;
    setProgress(0);

    const focusIsInside = document.activeElement && element.contains(document.activeElement);
    if (focusIsInside && previouslyFocused?.isConnected) {
      previouslyFocused.focus();
    }
    previouslyFocused = null;
  }

  function show(next, options = {}) {
    const { interactive: nextInteractive = true, message: infoMessage = null } = options;
    clearTimers();
    active = next;
    interactive = nextInteractive;
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

    if (interactive) {
      message.hidden = true;
      confirmButton.hidden = false;
      setProgress(0);
      startedAt = performance.now();
      animationFrameId = window.requestAnimationFrame(tick);
    } else {
      confirmButton.hidden = true;
      message.textContent = infoMessage || VIEWER_MESSAGE;
      message.hidden = false;
    }

    if (lastInputWasKeyboard) {
      (interactive ? confirmButton : dismissButton).focus();
    }
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
