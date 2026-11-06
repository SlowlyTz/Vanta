// A YouTube trailer playing muted behind a hero (detail page, home banner).
// Only on desktops with a fine pointer: not on phones (data, battery), TVs
// (their remote drives the page) or with reduced motion or data saving.
import { createElement } from '../utils/dom.js';
import { extractYouTubeVideoId } from './trailerModal.js';

// YouTube shows its title and controls for a moment after the start.
const REVEAL_DELAY_MS = 1800;
// Without any news from the player (its messages blocked) the trailer is
// shown this long after loading, as it plays all the same.
const SILENT_REVEAL_MS = 4000;
// A trailer that does not loop ends at the latest after this, should the
// player never report its end.
const MAX_PLAY_MS = 4 * 60 * 1000;

const PLAYING = 1;
const ENDED = 0;

export const SOUND_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"></path><path d="m22 9-6 6M16 9l6 6"></path></svg>';
export const SOUND_ON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"></path></svg>';

export function heroTrailerAllowed({ doc = document, win = window } = {}) {
  const html = doc.documentElement;
  if (html.classList.contains('tv-mode') || html.classList.contains('reduce-motion')) return false;
  if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  if (!win.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return false;
  if (win.innerWidth < 1024) return false;
  return win.navigator?.connection?.saveData !== true;
}

export function embedUrl(videoId, origin, { loop = true } = {}) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    ...(loop ? { loop: '1', playlist: videoId } : {}),
    playsinline: '1',
    modestbranding: '1',
    rel: '0',
    iv_load_policy: '3',
    disablekb: '1',
    enablejsapi: '1',
    origin
  });
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params}`;
}

// The YouTube trailer of an item: its remote trailers first, then its links.
export function trailerVideoIdOf(item) {
  if (!item) return null;
  const remote = Array.isArray(item.RemoteTrailers)
    ? item.RemoteTrailers.find(trailer => extractYouTubeVideoId(trailer?.Url))
    : null;
  if (remote) return extractYouTubeVideoId(remote.Url);
  const external = Array.isArray(item.ExternalUrls)
    ? item.ExternalUrls.find(entry => extractYouTubeVideoId(entry?.Url))
    : null;
  if (external) return extractYouTubeVideoId(external.Url);
  return extractYouTubeVideoId(item.TrailerUrl);
}

// The player's state from one of its messages, or null.
export function playerStateOf(data) {
  let message = data;
  if (typeof data === 'string') {
    try {
      message = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (message?.event === 'onStateChange' && Number.isInteger(message.info)) return message.info;
  if (message?.event === 'infoDelivery' && Number.isInteger(message.info?.playerState)) return message.info.playerState;
  return null;
}

// Plays one trailer in `layer`. `onReveal` once it really runs (the layer
// can fade in), `onEnded` when one that does not loop is over, `onFailed`
// when the video cannot play. `stop()` removes it.
export function playTrailer({ layer, videoId, loop = true, onReveal, onEnded, onFailed, win = window }) {
  let stopped = false;
  let revealed = false;
  let heard = false;
  const timers = [];
  const later = (fn, ms) => timers.push(win.setTimeout(fn, ms));

  const iframe = createElement('iframe', {
    className: 'background-trailer-frame',
    src: embedUrl(videoId, win.location.origin, { loop }),
    title: 'Trailer im Hintergrund',
    tabindex: '-1',
    allow: 'autoplay; encrypted-media',
    referrerpolicy: 'strict-origin-when-cross-origin'
  });

  const command = (func) => {
    iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
  };

  const reveal = () => {
    if (stopped || revealed) return;
    revealed = true;
    onReveal?.();
  };

  const finish = (callback) => {
    if (stopped) return;
    stop();
    callback?.();
  };

  const onMessage = (event) => {
    if (event.source !== iframe.contentWindow) return;
    let message = event.data;
    if (typeof message === 'string') {
      try { message = JSON.parse(message); } catch { return; }
    }
    heard = true;
    if (message?.event === 'onError') {
      finish(onFailed);
      return;
    }
    const state = playerStateOf(message);
    if (state === PLAYING && !revealed) later(reveal, REVEAL_DELAY_MS);
    if (state === ENDED && !loop) finish(onEnded);
  };
  win.addEventListener('message', onMessage);

  iframe.addEventListener('load', () => {
    if (stopped) return;
    // Asks the player to report its state.
    iframe.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: videoId, channel: 'widget' }), '*');
    later(() => { if (!heard) reveal(); }, SILENT_REVEAL_MS);
    if (!loop) later(() => finish(onEnded), MAX_PLAY_MS);
  }, { once: true });
  layer.appendChild(iframe);

  function stop() {
    if (stopped) return;
    stopped = true;
    timers.forEach(timer => win.clearTimeout(timer));
    win.removeEventListener('message', onMessage);
    iframe.remove();
  }

  return { command, stop, isRevealed: () => revealed };
}
