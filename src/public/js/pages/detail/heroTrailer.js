// The trailer behind the detail hero: after a few seconds on the page it fades
// in over the backdrop, muted and looping, with a button for the sound (see
// components/backgroundTrailer.js for where it plays at all).
import { createElement } from '../../utils/dom.js';
import { heroTrailerAllowed, playTrailer, SOUND_OFF, SOUND_ON } from '../../components/backgroundTrailer.js';

const START_DELAY_MS = 3500;

// Returns the layer (put it into the hero) and the sound button (shown once
// the trailer runs); null when the trailer must not play here.
export function createHeroTrailer({ videoId, scope, hero, win = window }) {
  if (!videoId || !heroTrailerAllowed({ win })) return null;

  const layer = createElement('div', { className: 'detail-hero-trailer', 'aria-hidden': 'true' });
  let player = null;
  let muted = true;
  let visible = true;

  const soundButton = createElement('button', {
    type: 'button',
    className: 'detail-hero-sound',
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

  const startTimer = win.setTimeout(() => {
    if (scope?.signal?.aborted) return;
    player = playTrailer({
      layer,
      videoId,
      win,
      onReveal: () => {
        hero.classList.add('is-trailer-playing');
        soundButton.hidden = false;
      },
      onFailed: () => {
        hero.classList.remove('is-trailer-playing');
        soundButton.hidden = true;
      }
    });
  }, START_DELAY_MS);

  // Scrolled past the hero: the trailer pauses (and its sound with it).
  const observer = 'IntersectionObserver' in win
    ? new win.IntersectionObserver(([entry]) => {
      const nowVisible = entry.isIntersecting;
      if (nowVisible === visible) return;
      visible = nowVisible;
      player?.command(visible ? 'playVideo' : 'pauseVideo');
    }, { threshold: 0.25 })
    : null;
  observer?.observe(hero);

  scope?.onLeave?.(() => {
    win.clearTimeout(startTimer);
    observer?.disconnect();
    player?.stop();
  });

  return { layer, soundButton };
}
