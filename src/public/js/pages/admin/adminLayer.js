import { createElement } from '../../utils/dom.js';
import { createBackIcon } from '../../components/navbar/icons.js';

export const LAYER_SLIDE_MS = 420;

// Open layers, bottom to top: Escape and the scroll lock follow the stack, so
// a settings page pushed over the settings area closes on its own.
const stack = [];

const syncScrollLock = () => {
  // A layer removed from the page by other means (the document was cleared)
  // no longer counts.
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (!stack[i].element.isConnected) stack.splice(i, 1);
  }
  document.documentElement.classList.toggle('admin-layer-open', stack.length > 0);
};

// A page of the admin area, pushed like on a phone: it slides in from the
// right over everything, with "‹ Zurück" in the top left, and slides back out
// the same way. `onBack` replaces the plain close (the areas navigate back,
// and the navigation closes the layer); `animate: false` opens it in place
// (a deep link or a reload).
export function openAdminLayer({
  title,
  subtitle = '',
  content,
  wide = false,
  animate = true,
  onBack = null,
  onClose
} = {}) {
  let closing = false;

  const goBack = () => (onBack ? onBack() : close());

  const backButton = createElement('button', {
    className: 'admin-layer-back',
    type: 'button',
    onClick: goBack
  }, createBackIcon(), createElement('span', {}, 'Zurück'));

  const layer = createElement('div', {
    className: `admin-layer${wide ? ' admin-layer-wide' : ''}`,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
    tabindex: '-1'
  },
    createElement('div', { className: 'admin-layer-bar' }, backButton),
    createElement('div', { className: 'admin-layer-scroll' },
      createElement('div', { className: 'admin-layer-inner' },
        createElement('header', { className: 'admin-layer-heading' },
          createElement('h2', { className: 'admin-layer-title' }, title),
          subtitle ? createElement('p', { className: 'admin-layer-subtitle' }, subtitle) : null
        ),
        content
      )
    )
  );

  const handle = { element: layer, close };

  // Only the top layer reacts, and not while an admin dialog sits above it
  // (that dialog closes on the same Escape).
  const handleKeydown = event => {
    if (event.key !== 'Escape' || stack.at(-1) !== handle) return;
    if (document.querySelector('.admin-user-dialog-overlay')) return;
    goBack();
  };

  function close({ immediate = false } = {}) {
    if (closing) return;
    closing = true;
    document.removeEventListener('keydown', handleKeydown);
    const index = stack.indexOf(handle);
    if (index !== -1) stack.splice(index, 1);
    syncScrollLock();
    layer.classList.remove('is-open');
    const remove = () => {
      layer.remove();
      onClose?.();
    };
    if (immediate) remove();
    else window.setTimeout(remove, LAYER_SLIDE_MS);
  }

  document.body.appendChild(layer);
  stack.push(handle);
  syncScrollLock();
  document.addEventListener('keydown', handleKeydown);

  const show = () => {
    if (closing) return;
    layer.classList.add('is-open');
    layer.focus({ preventScroll: true });
  };

  if (animate) {
    // Two frames: the layer must be laid out off screen before it can slide in.
    window.requestAnimationFrame(() => window.requestAnimationFrame(show));
  } else {
    layer.classList.add('no-slide');
    show();
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => layer.classList.remove('no-slide')));
  }

  return handle;
}
