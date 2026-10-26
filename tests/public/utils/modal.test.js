import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { openModal, closeAllModals, isModalOpen } from '../../../src/public/js/utils/modal.js';
import { createPageScope } from '../../../src/public/js/utils/pageScope.js';

const key = (k, options = {}) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...options }));

function buildDialog() {
  const overlay = document.createElement('div');
  const dialog = document.createElement('div');
  dialog.innerHTML = '<button id="one">1</button><input id="two"><button id="three">3</button>';
  overlay.appendChild(dialog);
  return { overlay, dialog };
}

describe('openModal', () => {
  let opener;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (fn) => { fn(); return 0; });
    window.scrollTo = vi.fn();
    document.body.innerHTML = '<div id="app"><button id="opener">open</button></div><div id="toast-container"></div>';
    opener = document.getElementById('opener');
    opener.focus();
  });

  afterEach(() => {
    closeAllModals();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('gives the dialog its semantics, moves focus in and back out', () => {
    const { overlay, dialog } = buildDialog();
    const modal = openModal({ overlay, dialog, label: 'Test' });

    expect(overlay.isConnected).toBe(true);
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Test');
    expect(document.activeElement.id).toBe('one');

    modal.close();
    expect(overlay.isConnected).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(isModalOpen()).toBe(false);
  });

  it('returns the focus to the fallback when the opener got hidden meanwhile', () => {
    const { overlay, dialog } = buildDialog();
    const fallback = document.createElement('button');
    document.body.appendChild(fallback);
    const modal = openModal({ overlay, dialog, returnFocus: () => fallback });

    opener.hidden = true;
    modal.close();
    expect(document.activeElement).toBe(fallback);
    opener.hidden = false;
    fallback.remove();
  });

  it('keeps Tab inside the dialog in both directions', () => {
    const { overlay, dialog } = buildDialog();
    openModal({ overlay, dialog });

    dialog.querySelector('#three').focus();
    key('Tab');
    expect(document.activeElement.id).toBe('one');

    key('Tab', { shiftKey: true });
    expect(document.activeElement.id).toBe('three');
  });

  it('closes on Escape and the backdrop, but not on a click inside', () => {
    const onClose = vi.fn();
    const first = buildDialog();
    openModal({ ...first, onClose });
    first.dialog.click();
    expect(onClose).not.toHaveBeenCalled();
    key('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);

    const second = buildDialog();
    const modal = openModal(second);
    second.overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal.isOpen).toBe(false);
  });

  it('only lets the topmost of stacked dialogs react and makes the rest inert', () => {
    const lower = buildDialog();
    const upper = buildDialog();
    const lowerModal = openModal(lower);
    expect(document.getElementById('app').inert).toBe(true);
    expect(document.getElementById('toast-container').inert).toBeFalsy();

    const upperModal = openModal(upper);
    expect(lower.overlay.inert).toBe(true);

    key('Escape');
    expect(upperModal.isOpen).toBe(false);
    expect(lowerModal.isOpen).toBe(true);
    expect(lower.overlay.inert).toBe(false);

    key('Escape');
    expect(document.getElementById('app').inert).toBe(false);
  });

  it('locks the page scroll until the last dialog closes', () => {
    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });
    const a = openModal(buildDialog());
    const b = openModal(buildDialog());
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-300px');

    a.close();
    expect(document.body.classList.contains('modal-open')).toBe(true);
    b.close();
    expect(document.body.style.position).toBe('');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 300);
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('closes when its page is left', () => {
    const scope = createPageScope();
    const modal = openModal({ ...buildDialog(), pageScope: scope });
    scope.leave();
    expect(modal.isOpen).toBe(false);
  });

  it('can leave a permanent overlay in the DOM', () => {
    const { overlay, dialog } = buildDialog();
    document.body.appendChild(overlay);
    openModal({ overlay, dialog, removeOnClose: false }).close();
    expect(overlay.isConnected).toBe(true);
  });
});
