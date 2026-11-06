// Trailers in the home banner (heroCarousel.js), desktops only: a few
// seconds after a title is shown its trailer fades in over the backdrop,
// muted, once through; then the banner moves on. One sound button serves all.
import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { heroTrailerAllowed, playTrailer, trailerVideoIdOf, SOUND_OFF, SOUND_ON } from './backgroundTrailer.js';

const START_DELAY_MS = 3500;

// Null where trailers must not play. `onDone(played)` tells the banner the
// trailer of the shown title is over (`played`) or there is none.
export function createCarouselTrailer({ container, onDone, win = window, api = MediaApi }) {
  if (!heroTrailerAllowed({ win })) return null;

  const layer = createElement('div', { className: 'hero-carousel-trailer', 'aria-hidden': 'true' });
  const videoIds = new Map();
  let player = null;
  let startTimer = null;
  let run = 0;
  let busy = false;
  let muted = true;
  let visible = true;

  const soundButton = createElement('button', {
    type: 'button',
    className: 'hero-carousel-sound',
    hidden: true,
    'aria-label': 'Ton des Trailers einschalten',
    onClick: () => {
      muted = !muted;
      player?.command(muted ? 'mute' : 'unMute');
      soundButton.innerHTML = muted ? SOUND_OFF : SOUND_ON;
      soundButton.setAttribute('aria-label', muted ? 'Ton des Trailers einschalten' : 'Ton des Trailers ausschalten');
    }
  });
  soundButton.innerHTML = SOUND_OFF;

  const hide = () => {
    container.classList.remove('is-trailer-playing');
    soundButton.hidden = true;
  };

  const stop = () => {
    run += 1;
    win.clearTimeout(startTimer);
    startTimer = null;
    player?.stop();
    player = null;
    busy = false;
    hide();
  };

  // The trailer of one title, looked up once per title.
  const videoIdOf = async (item) => {
    if (!videoIds.has(item.Id)) {
      videoIds.set(item.Id, trailerVideoIdOf(item) || api.getItem(item.Id).then(trailerVideoIdOf).catch(() => null));
    }
    return videoIds.get(item.Id);
  };

  const finish = (current, played) => {
    if (current !== run) return;
    player = null;
    busy = false;
    hide();
    onDone?.(played);
  };

  // Starts the trailer of the title now shown (ending the one before).
  const show = (item) => {
    stop();
    const current = run;
    busy = true;
    startTimer = win.setTimeout(async () => {
      const videoId = await videoIdOf(item);
      if (current !== run) return;
      if (!videoId) {
        finish(current, false);
        return;
      }
      player = playTrailer({
        layer,
        videoId,
        loop: false,
        win,
        onReveal: () => {
          if (current !== run) return;
          container.classList.add('is-trailer-playing');
          soundButton.hidden = false;
          if (!muted) player?.command('unMute');
          if (!visible || win.document.hidden) player?.command('pauseVideo');
        },
        onEnded: () => finish(current, true),
        onFailed: () => finish(current, false)
      });
    }, START_DELAY_MS);
  };

  // Out of sight (scrolled away, another tab) the trailer pauses.
  const sync = () => player?.command(visible && !win.document.hidden ? 'playVideo' : 'pauseVideo');
  const observer = 'IntersectionObserver' in win
    ? new win.IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === visible) return;
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.25 })
    : null;
  observer?.observe(container);
  win.document.addEventListener('visibilitychange', sync);

  const destroy = () => {
    stop();
    observer?.disconnect();
    win.document.removeEventListener('visibilitychange', sync);
  };

  return { layer, soundButton, show, stop, destroy, isBusy: () => busy };
}
