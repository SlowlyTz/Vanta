const YOUTUBE_IFRAME_API_URL = 'https://www.youtube.com/iframe_api';

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
    controls: '0',
    disablekb: '1',
    fs: '0',
    iv_load_policy: '3',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    loop: '0',
    enablejsapi: '1',
    origin: window.location.origin
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export class YouTubePlayerManager {
  constructor() {
    this.players = new Map();
    this.pending = new Map();
    this.destroyed = new Set();
  }

  async createPlayer(containerId, videoId, { autoplay = 0, muted = false, onReady, onError } = {}) {
    this.destroyed.delete(containerId);

    if (this.players.has(containerId)) {
      return this.players.get(containerId);
    }

    if (this.pending.has(containerId)) {
      return this.pending.get(containerId);
    }

    const YT = await loadYouTubeIframeApi();
    const target = document.getElementById(containerId);
    if (!target || !target.isConnected) {
      return null;
    }

    const promise = new Promise((resolve) => {
      const player = new YT.Player(containerId, {
        videoId,
        playerVars: {
          autoplay,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          mute: muted ? 1 : 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          loop: 0,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            if (this.destroyed.has(containerId)) {
              try {
                player.destroy();
              } catch {
                // ignore
              }
              this.pending.delete(containerId);
              resolve(null);
              return;
            }
            this.players.set(containerId, player);
            this.pending.delete(containerId);
            if (onReady) onReady(event);
            resolve(player);
          },
          onError: (event) => {
            this.pending.delete(containerId);
            if (onError) onError(event);
            resolve(player);
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
    });

    this.pending.set(containerId, promise);
    return promise;
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
      try {
        player.destroy();
      } catch {
        // ignore
      }
      this.players.delete(containerId);
    }
    this.pending.delete(containerId);
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
