import { describe, it, expect, afterEach } from 'vitest';
import { Toast } from '../../../src/public/js/components/toast.js';

describe('Toast', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('shows text, never markup, and hides the icon from screen readers', () => {
    document.body.innerHTML = '<div id="toast-container" role="status" aria-live="polite"></div>';
    Toast.show('<img src=x onerror=alert(1)> Fehler', 'info');

    const toast = document.querySelector('.toast-message');
    expect(toast.querySelector('.toast-text').textContent).toBe('<img src=x onerror=alert(1)> Fehler');
    expect(toast.querySelector('img')).toBeNull();
    expect(toast.querySelector('.toast-icon').getAttribute('aria-hidden')).toBe('true');
    expect(toast.getAttribute('role')).toBeNull();
  });

  it('announces errors right away', () => {
    document.body.innerHTML = '<div id="toast-container"></div>';
    Toast.show('Kaputt', 'error');
    expect(document.querySelector('.toast-message').getAttribute('role')).toBe('alert');
  });
});
