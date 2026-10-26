import { toTicks } from './time.js';
import { isStreamLimitError } from './streamLimit.js';

const PROGRESS_INTERVAL_MS = 10_000;
const REPORT_RETRY_LIMIT = 3;
const REPORT_RETRY_DELAY_MS = 50;

const normalizeSubtitleStreamIndex = streamIndex =>
  Number.isInteger(streamIndex) && streamIndex >= 0 ? streamIndex : null;

// `onStreamLimit`: the server no longer counts this stream and the limit is
// full (it was gone too long, e.g. a phone asleep): the page leaves the player.
export function createJellyfinReporter({ player, itemId, report, onStreamLimit = null }) {
  let playback = null;
  let started = false;
  let stopped = false;
  let switching = false;
  let progressTimer = null;
  let lastPosition = 0;
  let lastSentPositionTicks = -1;
  let stopInProgress = false;
  let pageHideHandled = false;
  // Set when the video played to its end; a 'playing' after it starts anew.
  let endedAt = null;
  let activeSubtitleStreamIndex = null;

  const globalListeners = [];

  const addGlobalListener = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    globalListeners.push(() => target.removeEventListener(event, handler, options));
  };

  const getPosition = () => {
    const current = Number(player.currentTime);
    if (Number.isFinite(current) && current >= 0) lastPosition = current;
    return lastPosition;
  };

  const buildPayload = (position = getPosition()) => ({
    itemId,
    mediaSourceId: playback?.mediaSourceId || null,
    playSessionId: playback?.playSessionId || null,
    positionTicks: toTicks(position),
    isPaused: Boolean(player.paused),
    isMuted: Boolean(player.muted),
    volumeLevel: Math.round((Number(player.volume) || 0) * 100),
    playbackRate: Number(player.playbackRate) || 1,
    playMethod: playback?.playMethod || (playback?.isTranscoded ? 'Transcode' : 'DirectPlay'),
    canSeek: true,
    audioStreamIndex: playback?.audioStreamIndex ?? null,
    subtitleStreamIndex: activeSubtitleStreamIndex
  });

  const shouldSendPosition = (positionTicks) => {
    if (positionTicks === lastSentPositionTicks) return false;
    if (positionTicks < lastSentPositionTicks) {
      return positionTicks > 0 || lastSentPositionTicks === 0;
    }
    return true;
  };

  const sendWithRetry = async (event, options = {}) => {
    if (!playback?.playSessionId) return;
    if (stopped && event !== 'start' && event !== 'ended') return;

    const payload = buildPayload(options.position);
    // A heartbeat goes out even without a new position (paused).
    if (event === 'progress' && !options.heartbeat && !shouldSendPosition(payload.positionTicks)) return;

    const attempt = async (retries = 0) => {
      try {
        await report(event, payload, options);
        lastSentPositionTicks = payload.positionTicks;
      } catch (error) {
        if (isStreamLimitError(error)) {
          stopTimer();
          onStreamLimit?.(error);
          return;
        }
        if (retries < REPORT_RETRY_LIMIT) {
          await new Promise(resolve => setTimeout(resolve, REPORT_RETRY_DELAY_MS));
          return attempt(retries + 1);
        }
        console.warn(`[Player Reporting] ${event} failed after ${REPORT_RETRY_LIMIT + 1} attempts:`, error);
      }
    };

    return attempt();
  };

  const stopTimer = () => {
    if (!progressTimer) return;
    clearInterval(progressTimer);
    progressTimer = null;
  };

  // Playing: the position. Paused: a heartbeat, since an open player counts
  // as a stream until it is closed (stream-session.service.js).
  const startTimer = () => {
    stopTimer();
    progressTimer = setInterval(() => {
      if (switching) return;
      if (player.paused) sendWithRetry('progress', { heartbeat: true });
      else sendWithRetry('progress');
    }, PROGRESS_INTERVAL_MS);
  };

  const start = async () => {
    if (!playback || switching || pageHideHandled) return;
    // Not started yet, or played again after the end (which reported
    // 'ended'): a fresh start, so the rewatch is saved like any playback.
    if (!started || (stopped && endedAt !== null)) {
      stopped = false;
      started = true;
      endedAt = null;
      await sendWithRetry('start');
    } else {
      await sendWithRetry('progress');
    }
    startTimer();
  };

  const progress = async () => {
    if (!playback || switching || !started) return;
    await sendWithRetry('progress');
  };

  const beforeSourceSwitch = async () => {
    switching = true;
    stopTimer();
    if (started && !stopped) {
      await sendWithRetry('progress');
    }
  };

  const afterSourceSwitch = () => {
    switching = false;
    stopped = false;
  };

  const setPlayback = nextPlayback => {
    playback = nextPlayback;
    endedAt = null;
    activeSubtitleStreamIndex = normalizeSubtitleStreamIndex(nextPlayback?.subtitleStreamIndex);
    stopped = false;
    switching = false;
    started = false;
  };

  const setSubtitleStreamIndex = streamIndex => {
    activeSubtitleStreamIndex = normalizeSubtitleStreamIndex(streamIndex);
  };

  // Left before playback started: the server still holds a slot for this
  // session. 'cancel' frees it without telling Jellyfin about a stop.
  const cancel = ({ keepalive = false } = {}) => {
    if (!playback?.playSessionId || started || stopped) return Promise.resolve();
    stopped = true;
    stopTimer();
    return Promise.resolve(report('cancel', buildPayload(getPosition()), { keepalive })).catch(() => {});
  };

  const stop = async ({ ended = false, keepalive = false } = {}) => {
    if (stopInProgress || pageHideHandled) return;
    if (!started) return cancel({ keepalive });
    if (!playback || stopped) return;
    stopInProgress = true;
    stopTimer();
    await sendWithRetry(ended ? 'ended' : 'stopped', { keepalive });
    stopped = true;
    stopInProgress = false;
  };

  const onTimeUpdate = () => {
    const current = Number(player.currentTime);
    if (Number.isFinite(current) && current >= 0) lastPosition = current;
  };

  const onVisibilityChange = () => {
    if (document.hidden && started && !stopped) {
      sendWithRetry('progress');
    }
  };

  // Always keepalive: a tab that closes or reloads (persisted false) is
  // exactly when the browser would drop a plain request, and the server
  // would hold the stream slot until its timeout.
  const onPageHide = () => {
    if (pageHideHandled || stopped) return;
    if (!started) {
      cancel({ keepalive: true });
      return;
    }
    pageHideHandled = true;
    stopTimer();
    report('stopped', buildPayload(getPosition()), { keepalive: true }).catch(() => {});
  };

  // Back from the back/forward cache: the page lives again and the stream
  // counts again with its next start.
  const onPageShow = event => {
    if (!event.persisted || !pageHideHandled) return;
    pageHideHandled = false;
    started = false;
    stopped = false;
    if (!player.paused) start();
  };

  const onEnded = () => {
    endedAt = Date.now();
    return stop({ ended: true });
  };

  player.addEventListener('time-update', onTimeUpdate);
  player.addEventListener('playing', start);
  player.addEventListener('pause', progress);
  player.addEventListener('seeked', progress);
  player.addEventListener('ended', onEnded);

  addGlobalListener(document, 'visibilitychange', onVisibilityChange);
  addGlobalListener(window, 'pagehide', onPageHide, { capture: true });
  addGlobalListener(window, 'pageshow', onPageShow, { capture: true });

  return {
    setPlayback,
    setSubtitleStreamIndex,
    beforeSourceSwitch,
    afterSourceSwitch,
    stop,
    getPosition,
    progress,
    destroy: () => {
      stopTimer();
      pageHideHandled = true;
      player.removeEventListener('time-update', onTimeUpdate);
      player.removeEventListener('playing', start);
      player.removeEventListener('pause', progress);
      player.removeEventListener('seeked', progress);
      player.removeEventListener('ended', onEnded);
      globalListeners.splice(0).forEach(cleanup => cleanup());
    }
  };
}
