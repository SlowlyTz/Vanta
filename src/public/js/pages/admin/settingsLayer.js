import { createElement } from '../../utils/dom.js';
import { createBackIcon } from '../../components/navbar/icons.js';

const SLIDE_MS = 420;

// A sub page of the admin settings, pushed like on a phone: it slides in from
// the right over everything, with "‹ Zurück" in the top left, and slides back
// out the same way. Only one layer is open at a time.
export function openSettingsLayer({ title, content, onClose } = {}) {
  let closing = false;

  const backButton = createElement('button', {
    className: 'admin-settings-layer-back',
    type: 'button',
    onClick: () => close()
  }, createBackIcon(), createElement('span', {}, 'Zurück'));

  const layer = createElement('div', {
    className: 'admin-settings-layer',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title,
    tabindex: '-1'
  },
    createElement('div', { className: 'admin-settings-layer-bar' }, backButton),
    createElement('div', { className: 'admin-settings-layer-scroll' },
      createElement('div', { className: 'admin-settings-layer-inner' },
        createElement('h2', { className: 'admin-settings-layer-title' }, title),
        content
      )
    )
  );

  const handleKeydown = event => {
    if (event.key === 'Escape') close();
  };

  function close({ immediate = false } = {}) {
    if (closing) return;
    closing = true;
    document.removeEventListener('keydown', handleKeydown);
    document.documentElement.classList.remove('admin-settings-layer-open');
    layer.classList.remove('is-open');
    const remove = () => {
      layer.remove();
      onClose?.();
    };
    if (immediate) remove();
    else window.setTimeout(remove, SLIDE_MS);
  }

  document.addEventListener('keydown', handleKeydown);
  document.documentElement.classList.add('admin-settings-layer-open');
  document.body.appendChild(layer);
  // Two frames: the layer must be laid out off screen before it can slide in.
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    if (closing) return;
    layer.classList.add('is-open');
    layer.focus({ preventScroll: true });
  }));

  return { element: layer, close };
}
