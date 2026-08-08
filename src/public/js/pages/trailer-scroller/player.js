const YOUTUBE_IFRAME_API_URL = 'https://www.youtube.com/iframe_api';
const YOUTUBE_IFRAME_ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
const YOUTUBE_REFERRER_POLICY = 'strict-origin-when-cross-origin';

// YouTube reports neither onReady nor onError when an embed dies silently. Without an upper
// bound the returned promise would never settle and every later caller would await the same
// dead promise, which used to freeze the whole feed until a page reload.
export const PLAYER_READY_TIMEOUT_MS = 12000;

let apiLoadPromise = null;

export function loadYouTubeIframeApi() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${YOUTUBE_IFRAME_API_URL}"]`);
    const previousReady = window.onYouTubeIframeAPIReady;

    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = YOUTUBE_IFRAME_API_URL;
      tag.async = true;
      tag.defer = true;
      tag.onerror = () => reject(new Error('Failed to load YouTube IFrame API'));
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousReady === 'function') {
        previousReady();
      }
      clearTimeout(fallbackTimer);
      resolve(window.YT);
    };

    const fallbackTimer = setTimeout(() => {
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      } else {
        reject(new Error('Timed out loading YouTube IFrame API'));
      }
    }, 5000);
  }).catch(error => {
    apiLoadPromise = null;
    throw error;
  });

  return apiLoadPromise;
}

export function getYouTubeEmbedUrl(videoId, { autoplay = 1, mute = 0 } = {}) {
  const params = new URLSearchParams({
    autoplay: String(autoplay),
    mute: String(mute),
    controls: '1',
    disablekb: '0',
    fs: '1',
    iv_load_policy: '3',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    loop: '0',
    enablejsapi: '1',
    origin: window.location.origin,
    widget_referrer: window.location.href
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function setYouTubeIframeAttributes(iframe) {
  if (!iframe) return;
  iframe.setAttribute('allow', YOUTUBE_IFRAME_ALLOW);
  iframe.setAttribute('referrerpolicy', YOUTUBE_REFERRER_POLICY);
  iframe.setAttribute('playsinline', '1');
  iframe.setAttribute('allowfullscreen', 'true');
}

function createYouTubeIframe(iframeId, videoId, { autoplay, muted }) {
  const iframe = document.createElement('iframe');
  iframe.id = iframeId;
  iframe.title = 'YouTube Trailer';
  iframe.src = getYouTubeEmbedUrl(videoId, {
    autoplay,
    mute: muted ? 1 : 0
  });
  iframe.frameBorder = '0';
  setYouTubeIframeAttributes(iframe);
  return iframe;
}

function configureYouTubeIframe(player) {
  if (!player || typeof player.getIframe !== 'function') return;
  try {
    setYouTubeIframeAttributes(player.getIframe());
  } catch {
    // YouTube owns the iframe lifecycle; failing to set optional attrs should not break playback.
  }
}

function destroyPlayer(player) {
  if (!player || typeof player.destroy !== 'function') return;
  try {
    player.destroy();
  } catch {
    // ignore
  }
}

export class YouTubePlayerManager {
  constructor() {
    this.players = new Map();
    this.pending = new Map();
    this.destroyed = new Set();
  }

  createPlayer(containerId, videoId, { autoplay = 0, muted = false, onReady, onError } = {}) {
    this.destroyed.delete(containerId);

    const readyPlayer = this.players.get(containerId);
    if (readyPlayer) return Promise.resolve(readyPlayer);

    const runningAttempt = this.pending.get(containerId);
    if (runningAttempt) return runningAttempt.promise;

    // The attempt has to be registered synchronously. Registering it after the first await let
    // two overlapping sync runs build two iframes with the same id; the detached one never
    // reported back.
    const attempt = { settled: false, timer: null, player: null, resolve: null, promise: null };
    attempt.promise = new Promise((resolve) => {
      attempt.resolve = resolve;
    });
    this.pending.set(containerId, attempt);

    this._startPlayer(containerId, videoId, { autoplay, muted, onReady, onError }, attempt);

    return attempt.promise;
  }

  async _startPlayer(containerId, videoId, { autoplay, muted, onReady, onError }, attempt) {
    const target = document.getElementById(containerId);
    if (!target || !target.isConnected) {
      this._settleAttempt(containerId, null);
      return;
    }

    const iframeId = `${containerId}-iframe`;
    const iframe = createYouTubeIframe(iframeId, videoId, { autoplay, muted });
    target.replaceChildren(iframe);

    let YT;
    try {
      YT = await loadYouTubeIframeApi();
    } catch (error) {
      iframe.remove();
      this._settleAttempt(containerId, null);
      if (onError) onError(error);
      return;
    }

    if (this.destroyed.has(containerId) || !target.isConnected) {
      iframe.remove();
      this._settleAttempt(containerId, null);
      return;
    }

    attempt.timer = setTimeout(() => {
      if (attempt.settled) return;
      destroyPlayer(attempt.player);
      target.replaceChildren();
      this._settleAttempt(containerId, null);
      if (onError) onError(new Error(`YouTube player timed out for ${videoId}`));
    }, PLAYER_READY_TIMEOUT_MS);

    attempt.player = new YT.Player(iframeId, {
      host: 'https://www.youtube.com',
      events: {
        onReady: (event) => {
          // Already given up on (timeout) or torn down meanwhile: the iframe this player is
          // bound to is gone, so registering it would hand syncPlayers a dead player.
          if (attempt.settled || this.destroyed.has(containerId)) {
            destroyPlayer(attempt.player);
            this._settleAttempt(containerId, null);
            return;
          }
          configureYouTubeIframe(attempt.player);
          this.players.set(containerId, attempt.player);
          this._settleAttempt(containerId, attempt.player);
          if (onReady) onReady(event);
        },
        onError: (event) => {
          if (attempt.settled) return;
          // Leaving the attempt in `pending` would make the failure permanent — dropping it
          // lets the next sync run retry this slide.
          this._settleAttempt(containerId, null);
          if (onError) onError(event);
        },
        onStateChange: (event) => {
          if (event.data !== YT.PlayerState.ENDED) return;
          try {
            event.target.seekTo(0, true);
            event.target.playVideo();
          } catch {
            // ignore
          }
        }
      }
    });
  }

  _settleAttempt(containerId, value) {
    const attempt = this.pending.get(containerId);
    if (!attempt) return;

    this.pending.delete(containerId);
    if (attempt.timer) clearTimeout(attempt.timer);
    if (attempt.settled) return;

    attempt.settled = true;
    attempt.resolve(value);
  }

  play(containerId) {
    const player = this.players.get(containerId);
    if (player && typeof player.playVideo === 'function') {
      try {
        player.playVideo();
      } catch {
        // ignore
      }
    }
  }

  pause(containerId) {
    const player = this.players.get(containerId);
    if (player && typeof player.pauseVideo === 'function') {
      try {
        player.pauseVideo();
      } catch {
        // ignore
      }
    }
  }

  stop(containerId) {
    const player = this.players.get(containerId);
    if (player && typeof player.stopVideo === 'function') {
      try {
        player.stopVideo();
      } catch {
        // ignore
      }
    }
  }

  destroy(containerId) {
    this.destroyed.add(containerId);

    const player = this.players.get(containerId);
    if (player) {
      destroyPlayer(player);
      this.players.delete(containerId);
    }

    const attempt = this.pending.get(containerId);
    if (attempt) {
      destroyPlayer(attempt.player);
      // Settling instead of just dropping the entry — otherwise whoever awaits this attempt
      // never comes back.
      this._settleAttempt(containerId, null);
    }
  }

  destroyAll() {
    const containerIds = new Set([
      ...this.players.keys(),
      ...this.pending.keys()
    ]);
    for (const containerId of containerIds) {
      this.destroy(containerId);
    }
    this.pending.clear();
  }
}
