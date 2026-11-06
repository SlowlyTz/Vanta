// A glow in the colours of the hovered cover behind a page: the black page
// background shifts towards the poster and back once the pointer leaves the
// cards. Two layers cross-fade, since a gradient itself cannot transition.
import { createElement } from '../utils/dom.js';
import { coverColorsOf, whenCoverColors, rgbText } from '../utils/coverColors.js';

const LEAVE_DELAY_MS = 900;
const CARD_SELECTOR = '.media-card[data-item-id], .top10-card[data-item-id]';

export function ambientGradient({ primary, secondary }) {
  return [
    `radial-gradient(ellipse 80% 60% at 18% 0%, rgba(${rgbText(primary)}, 0.62), transparent 70%)`,
    `radial-gradient(ellipse 70% 55% at 88% 22%, rgba(${rgbText(secondary)}, 0.5), transparent 70%)`,
    `linear-gradient(180deg, rgba(${rgbText(primary)}, 0.22), transparent 85%)`
  ].join(', ');
}

// `root` is the page whose cards set the colour; the layer lives on the body
// (a transformed page would carry a fixed layer away) and goes with the page.
export function bindAmbientBackdrop(root, { scope, doc = document, win = window } = {}) {
  // TV mode shows the focused card's backdrop instead (tv/focusBackdrop.js).
  if (doc.documentElement.classList.contains('tv-mode')) return () => {};

  const layers = [createElement('div', { className: 'ambient-layer' }), createElement('div', { className: 'ambient-layer' })];
  const element = createElement('div', { className: 'ambient-backdrop', 'aria-hidden': 'true' }, ...layers);
  doc.body.prepend(element);
  doc.documentElement.classList.add('has-ambient');

  let front = 0;
  let shownKey = null;
  let leaveTimer = null;
  let wanted = null;

  const show = (colors, key) => {
    if (!colors || key === shownKey) return;
    shownKey = key;
    front = 1 - front;
    layers[front].style.backgroundImage = ambientGradient(colors);
    layers[front].classList.add('is-visible');
    layers[1 - front].classList.remove('is-visible');
  };

  const clear = () => {
    shownKey = null;
    layers.forEach(layer => layer.classList.remove('is-visible'));
  };

  const enter = (card) => {
    win.clearTimeout(leaveTimer);
    const img = card.querySelector('img');
    if (!img) return;
    wanted = card;
    const key = img.currentSrc || img.src;
    const ready = coverColorsOf(img);
    if (ready) show(ready, key);
    else whenCoverColors(img).then(colors => { if (wanted === card) show(colors, key); });
  };

  const onOver = (event) => {
    // Touch has no hover; a tap goes straight to the detail page.
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const card = event.target.closest?.(CARD_SELECTOR);
    if (card && root.contains(card)) enter(card);
  };
  const onOut = (event) => {
    const card = event.target.closest?.(CARD_SELECTOR);
    if (!card || card.contains(event.relatedTarget)) return;
    wanted = null;
    win.clearTimeout(leaveTimer);
    leaveTimer = win.setTimeout(clear, LEAVE_DELAY_MS);
  };
  // Keyboard users get the same colour on the focused card.
  const onFocus = (event) => {
    const card = event.target.closest?.(CARD_SELECTOR);
    if (card) enter(card);
  };

  root.addEventListener('pointerover', onOver);
  root.addEventListener('pointerout', onOut);
  root.addEventListener('focusin', onFocus);
  root.addEventListener('focusout', onOut);

  const dispose = () => {
    win.clearTimeout(leaveTimer);
    root.removeEventListener('pointerover', onOver);
    root.removeEventListener('pointerout', onOut);
    root.removeEventListener('focusin', onFocus);
    root.removeEventListener('focusout', onOut);
    element.remove();
    // The next page may already have its own layer.
    if (!doc.querySelector('.ambient-backdrop')) doc.documentElement.classList.remove('has-ambient');
  };
  scope?.onLeave?.(dispose);
  return dispose;
}
