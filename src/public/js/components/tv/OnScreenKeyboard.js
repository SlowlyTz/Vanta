// On-screen keyboard for typing with the TV remote, inline or as a modal over any text field.
import { createElement } from '../../utils/dom.js';
import { openModal } from '../../utils/modal.js';

const LETTERS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'ß'],
  ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
  ['y', 'x', 'c', 'v', 'b', 'n', 'm', '-', '.', '@', '_']
];
// With shift: capitals and the signs a password or user name may hold.
const SHIFTED = [
  ['!', '?', '#', '$', '%', '&', '*', '+', '=', '/', '"'],
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
  ['Y', 'X', 'C', 'V', 'B', 'N', 'M', ';', ':', ',', "'"]
];

// Every key changes `input` and fires its `input` event, so the page reacts
// as to typing. A physical keyboard keeps working alongside.
export function createOnScreenKeyboard({ input, onDone = null, shift: allowShift = true }) {
  let shifted = false;
  const rows = createElement('div', { className: 'osk-rows' });
  const element = createElement('div', { className: 'osk', role: 'group', 'aria-label': 'Bildschirmtastatur' }, rows);

  const emit = () => input.dispatchEvent(new Event('input', { bubbles: true }));
  const type = text => {
    input.value += text;
    emit();
  };
  const erase = () => {
    input.value = input.value.slice(0, -1);
    emit();
  };
  // Backspace on a key deletes (keys.js does not take it for Back here).
  element.addEventListener('keydown', event => {
    if (event.key !== 'Backspace') return;
    event.preventDefault();
    erase();
  });

  const key = (label, onPress, { wide = false, name = null } = {}) => createElement('button', {
    type: 'button',
    className: `osk-key${wide ? ' is-wide' : ''}`,
    'aria-label': name || label,
    dataset: { tvKey: `osk-${name || label}` },
    onClick: onPress
  }, label);

  const render = () => {
    const layout = shifted ? SHIFTED : LETTERS;
    const keyRows = layout.map(letters => createElement('div', { className: 'osk-row', 'data-tv-row': '' },
      ...letters.map(letter => key(letter, () => type(letter)))));
    const actions = createElement('div', { className: 'osk-row osk-actions', 'data-tv-row': '' },
      allowShift ? key('⇧', () => { shifted = !shifted; render(); }, { name: 'Umschalten' }) : null,
      key('Leerzeichen', () => type(' '), { wide: true }),
      key('⌫', erase, { name: 'Löschen' }),
      key('Leeren', () => { input.value = ''; emit(); }),
      onDone ? key('Fertig', () => onDone()) : null
    );
    rows.replaceChildren(...keyRows, actions);
  };
  render();
  return { element };
}

// For any other text field: OK on it opens the keyboard over the page.
export function openKeyboardFor(input) {
  const preview = createElement('div', { className: 'osk-preview', 'aria-hidden': 'true' });
  const updatePreview = () => {
    preview.textContent = input.type === 'password' ? '•'.repeat(input.value.length) : input.value;
  };
  const label = input.getAttribute('aria-label') || input.placeholder || input.labels?.[0]?.textContent || 'Eingabe';
  let handle = null;
  const keyboard = createOnScreenKeyboard({ input, onDone: () => handle?.close() });
  const dialog = createElement('div', { className: 'osk-dialog', 'aria-label': label },
    createElement('div', { className: 'osk-title' }, label),
    preview,
    keyboard.element
  );
  const overlay = createElement('div', { className: 'osk-backdrop' }, dialog);
  input.addEventListener('input', updatePreview);
  updatePreview();
  handle = openModal({
    overlay,
    dialog,
    initialFocus: '.osk-key',
    onClose: () => input.removeEventListener('input', updatePreview)
  });
  return handle;
}
