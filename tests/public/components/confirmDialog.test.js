import { describe, it, expect, beforeEach } from 'vitest';
import { confirmDialog } from '../../../src/public/js/components/confirmDialog.js';

describe('confirmDialog', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('resolves true on the confirm button', async () => {
    const promise = confirmDialog({ title: 'Sicher?', message: 'Wirklich?' });
    const dialog = document.querySelector('.confirm-dialog');
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(dialog.querySelector('.confirm-dialog-title').textContent).toBe('Sicher?');
    dialog.querySelector('.confirm-dialog-confirm').click();
    expect(await promise).toBe(true);
    expect(document.querySelector('.confirm-dialog-overlay')).toBeNull();
  });

  it('resolves false on "Nein", Escape and a backdrop click', async () => {
    let promise = confirmDialog({ title: 'A' });
    document.querySelector('.confirm-dialog-cancel').click();
    expect(await promise).toBe(false);

    promise = confirmDialog({ title: 'B' });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(await promise).toBe(false);

    promise = confirmDialog({ title: 'C' });
    document.querySelector('.confirm-dialog-overlay').click();
    expect(await promise).toBe(false);
    expect(document.querySelector('.confirm-dialog-overlay')).toBeNull();
  });
});
