import { describe, it, expect, vi, afterEach } from 'vitest';
import { createOnScreenKeyboard, openKeyboardFor } from '../../../src/public/js/components/tv/OnScreenKeyboard.js';
import { closeAllModals } from '../../../src/public/js/utils/modal.js';

const press = (root, name) => root.querySelector(`[aria-label="${name}"]`).click();

describe('on-screen keyboard', () => {
  afterEach(() => {
    closeAllModals();
    document.body.innerHTML = '';
  });

  it('types into the field and fires its input event', () => {
    const input = document.createElement('input');
    const onInput = vi.fn();
    input.addEventListener('input', onInput);
    const { element } = createOnScreenKeyboard({ input, shift: false });
    press(element, 'd');
    press(element, 'ä');
    press(element, 'Leerzeichen');
    press(element, '2');
    expect(input.value).toBe('dä 2');
    press(element, 'Löschen');
    expect(input.value).toBe('dä ');
    press(element, 'Leeren');
    expect(input.value).toBe('');
    expect(onInput).toHaveBeenCalledTimes(6);
    expect(element.querySelectorAll('[data-tv-row]').length).toBe(5);
    expect(element.querySelector('[aria-label="Umschalten"]')).toBeNull();
  });

  it('deletes with Backspace on a key and offers capitals for user names too', () => {
    const input = document.createElement('input');
    input.value = 'ab';
    const { element } = createOnScreenKeyboard({ input });
    document.body.appendChild(element);
    const key = element.querySelector('[aria-label="d"]');
    const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
    key.dispatchEvent(event);
    expect(input.value).toBe('a');
    expect(event.defaultPrevented).toBe(true);
    expect(element.querySelector('[aria-label="Umschalten"]')).not.toBeNull();
  });

  it('offers capitals and signs for passwords', () => {
    const input = document.createElement('input');
    input.type = 'password';
    const { element } = createOnScreenKeyboard({ input });
    press(element, 'Umschalten');
    press(element, 'A');
    press(element, '!');
    expect(input.value).toBe('A!');
  });

  it('opens over the page for another field and closes on "Fertig"', () => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Benutzername');
    document.body.appendChild(input);
    openKeyboardFor(input);
    const dialog = document.querySelector('.osk-dialog');
    expect(dialog.querySelector('.osk-title').textContent).toBe('Benutzername');
    press(dialog, 'k');
    expect(dialog.querySelector('.osk-preview').textContent).toBe('k');
    press(dialog, 'Fertig');
    expect(document.querySelector('.osk-dialog')).toBeNull();
    expect(input.value).toBe('k');
  });
});
